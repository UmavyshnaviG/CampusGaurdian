"""
Agent 1: Data Understanding Agent
==================================
Responsibilities:
  - Inspect uploaded CSV/XLSX datasets (schema, types, nulls, duplicates)
  - Suggest column mappings via string similarity + keyword heuristics
  - Compute a data quality score
  - Produce batch-processable rows using confirmed column mappings

All statistics are computed deterministically (pandas / difflib).
No LLM is used in this agent.
"""
from __future__ import annotations

import logging
import os
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Target schema field names (what the rest of the pipeline expects)
# ---------------------------------------------------------------------------
TARGET_FIELDS: List[str] = [
    'description',
    'category',
    'severity',
    'location',
    'submittedBy',
    'department',
    'year',
    'userType',
    'anonymous',
    'status',
    'createdAt',
    'sentiment',
    'outcome',
]

# Keyword aliases for each target field — boosts similarity matching
FIELD_KEYWORDS: Dict[str, List[str]] = {
    'description':  ['text', 'desc', 'complaint', 'feedback', 'message', 'comment', 'details', 'issue'],
    'category':     ['type', 'cat', 'class', 'kind', 'topic', 'subject', 'department_type'],
    'severity':     ['priority', 'level', 'urgency', 'impact', 'sev', 'grade'],
    'location':     ['place', 'building', 'block', 'room', 'area', 'venue', 'where', 'loc'],
    'submittedBy':  ['user', 'userid', 'reporter', 'student', 'author', 'submitted_by', 'name'],
    'department':   ['dept', 'branch', 'section', 'faculty', 'division', 'school'],
    'year':         ['semester', 'grade', 'year_of_study', 'batch', 'class'],
    'userType':     ['role', 'user_type', 'usertype', 'type', 'user_role'],
    'anonymous':    ['anon', 'is_anonymous', 'hidden', 'private'],
    'status':       ['state', 'resolution', 'current_status', 'result', 'outcome_status'],
    'createdAt':    ['date', 'timestamp', 'time', 'submitted', 'created', 'created_at', 'submission_date'],
    'sentiment':    ['tone', 'feeling', 'emotion', 'polarity'],
    'outcome':      ['resolution', 'result', 'conclusion', 'action_taken', 'remedy'],
}


def _string_similarity(a: str, b: str) -> float:
    """SequenceMatcher ratio between two lowercased strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _keyword_boost(column_name: str, target_field: str) -> float:
    """
    Check whether the column name contains any alias keyword for the target field.
    Returns 0.2 boost if matched, 0.0 otherwise.
    """
    col_lower = column_name.lower().replace(' ', '_')
    for kw in FIELD_KEYWORDS.get(target_field, []):
        if kw in col_lower or col_lower in kw:
            return 0.20
    return 0.0


def _suggest_mapping(column_name: str) -> Dict[str, Any]:
    """
    For a single detected column name, compute similarity to all target fields
    and return the best match with a confidence score.
    """
    best_field: Optional[str] = None
    best_score: float = 0.0

    for field in TARGET_FIELDS:
        base_sim = _string_similarity(column_name, field)
        boost = _keyword_boost(column_name, field)
        score = min(base_sim + boost, 1.0)
        if score > best_score:
            best_score = score
            best_field = field

    if best_score >= 0.80:
        confidence_level = 'high_confidence'
    elif best_score >= 0.50:
        confidence_level = 'needs_review'
    else:
        confidence_level = 'uncertain'

    return {
        'suggestedMapping': best_field or '',
        'mappingConfidence': round(best_score, 4),
        'confidenceLevel': confidence_level,
    }


class DataUnderstandingAgent:
    """
    Agent 1 — inspects an uploaded CSV/XLSX, profiles columns, suggests
    column mappings, and converts raw rows to GrievanceInput-compatible dicts.
    """

    # ------------------------------------------------------------------
    # inspect_schema
    # ------------------------------------------------------------------

    def inspect_schema(self, filepath: str) -> Dict[str, Any]:
        """
        Load a CSV or XLSX file and return a rich schema inspection report.

        Returns a dict matching:
        {
            'totalRows': int,
            'totalColumns': int,
            'duplicateRows': int,
            'columns': [ { name, dtype, nullCount, nullPct, uniqueCount,
                           sampleValues, suggestedMapping, mappingConfidence,
                           confidenceLevel } ],
            'qualityIssues': [ str ],
            'dataQualityScore': float
        }
        On error, returns { 'error': str }.
        """
        # ------------------------------------------------------------------
        # 0. Lazy import pandas (not available at module load if not installed)
        # ------------------------------------------------------------------
        try:
            import pandas as pd
        except ImportError:
            return {'error': 'pandas is not installed. Run: pip install pandas openpyxl'}

        # ------------------------------------------------------------------
        # 1. Load file
        # ------------------------------------------------------------------
        if not os.path.isfile(filepath):
            return {'error': f'File not found: {filepath}'}

        ext = os.path.splitext(filepath)[1].lower()
        df = None

        if ext == '.csv':
            for enc in ('utf-8', 'latin-1', 'cp1252'):
                try:
                    df = pd.read_csv(filepath, encoding=enc, low_memory=False)
                    break
                except UnicodeDecodeError:
                    continue
            if df is None:
                return {'error': 'Could not decode CSV file. Tried utf-8, latin-1, cp1252.'}
        elif ext in ('.xlsx', '.xls'):
            try:
                df = pd.read_excel(filepath)
            except Exception as exc:
                return {'error': f'Failed to read Excel file: {exc}'}
        else:
            return {'error': f'Unsupported file format: {ext}. Supported: .csv, .xlsx'}

        # ------------------------------------------------------------------
        # 2. Basic stats
        # ------------------------------------------------------------------
        total_rows: int = len(df)
        total_columns: int = len(df.columns)
        duplicate_rows: int = int(df.duplicated().sum())

        # ------------------------------------------------------------------
        # 3. Per-column analysis
        # ------------------------------------------------------------------
        columns_info: List[Dict[str, Any]] = []
        quality_issues: List[str] = []

        for col in df.columns:
            series = df[col]
            null_count = int(series.isna().sum())
            null_pct = round(null_count / total_rows * 100, 2) if total_rows > 0 else 0.0
            unique_count = int(series.nunique(dropna=True))

            # Sample up to 5 non-null values
            non_null = series.dropna()
            sample_size = min(5, len(non_null))
            sample_values: List[Any] = (
                non_null.sample(sample_size, random_state=42).tolist()
                if sample_size > 0
                else []
            )
            # Make JSON-serialisable
            sample_values = [
                str(v) if not isinstance(v, (int, float, bool, type(None))) else v
                for v in sample_values
            ]

            dtype_str = str(series.dtype)

            # Column mapping suggestion
            mapping = _suggest_mapping(col)

            col_info: Dict[str, Any] = {
                'name': col,
                'dtype': dtype_str,
                'nullCount': null_count,
                'nullPct': null_pct,
                'uniqueCount': unique_count,
                'sampleValues': sample_values,
                **mapping,
            }
            columns_info.append(col_info)

            # ------------------------------------------------------------------
            # 4. Data quality issues
            # ------------------------------------------------------------------
            if null_pct > 20:
                quality_issues.append(
                    f'Column "{col}" has {null_pct:.1f}% missing values.'
                )
            if unique_count <= 1 and total_rows > 1:
                quality_issues.append(
                    f'Column "{col}" has only {unique_count} unique value(s) — may be constant.'
                )

            # Detect potential date columns and validate parseability
            if _looks_like_date_column(col, series):
                try:
                    pd.to_datetime(non_null.head(50), infer_datetime_format=True)
                except Exception:
                    quality_issues.append(
                        f'Column "{col}" looks like a date but could not be parsed.'
                    )

            # Flag probable ID columns
            if _looks_like_id(col, series, total_rows):
                quality_issues.append(
                    f'Column "{col}" appears to be an identifier column.'
                )

        # Duplicate row warning
        if duplicate_rows > 0:
            quality_issues.append(
                f'{duplicate_rows} duplicate row(s) detected in the dataset.'
            )

        # ------------------------------------------------------------------
        # 5. Data quality score  (0.0 – 1.0)
        # ------------------------------------------------------------------
        data_quality_score = _compute_quality_score(df, columns_info, duplicate_rows, total_rows)

        return {
            'totalRows': total_rows,
            'totalColumns': total_columns,
            'duplicateRows': duplicate_rows,
            'columns': columns_info,
            'qualityIssues': quality_issues,
            'dataQualityScore': round(data_quality_score, 4),
        }

    # ------------------------------------------------------------------
    # process_batch
    # ------------------------------------------------------------------

    def process_batch(self, filepath: str, column_mappings: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Load the file, apply column_mappings (detected_col → target_field),
        and return a list of GrievanceInput-compatible dicts.

        column_mappings example:
            { 'complaint_text': 'description', 'cat': 'category', ... }
        """
        try:
            import pandas as pd
        except ImportError:
            logger.error('pandas not installed')
            return []

        ext = os.path.splitext(filepath)[1].lower()
        df = None

        if ext == '.csv':
            for enc in ('utf-8', 'latin-1', 'cp1252'):
                try:
                    df = pd.read_csv(filepath, encoding=enc, low_memory=False)
                    break
                except UnicodeDecodeError:
                    continue
        elif ext in ('.xlsx', '.xls'):
            try:
                df = pd.read_excel(filepath)
            except Exception as exc:
                logger.error('Failed to read Excel: %s', exc)
                return []

        if df is None:
            return []

        # Rename columns according to the provided mappings
        rename_map = {k: v for k, v in column_mappings.items() if v}
        df = df.rename(columns=rename_map)

        results: List[Dict[str, Any]] = []
        for idx, row in df.iterrows():
            row_dict = row.where(row.notna(), other=None).to_dict()

            grievance_input: Dict[str, Any] = {
                'grievanceId': f'hist_{idx}',
                'text': str(row_dict.get('description', '') or ''),
                'category': str(row_dict.get('category', '') or 'Other'),
                'severity': str(row_dict.get('severity', '') or 'Low'),
                'userId': str(row_dict.get('submittedBy', '') or ''),
                'anonymous': _parse_bool(row_dict.get('anonymous', False)),
                'location': str(row_dict.get('location', '') or ''),
                'createdAt': str(row_dict.get('createdAt', '') or ''),
            }
            results.append(grievance_input)

        return results


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _looks_like_date_column(col_name: str, series: Any) -> bool:
    """Heuristic: column name contains date-like keywords."""
    date_keywords = ['date', 'time', 'created', 'submitted', 'at', 'timestamp']
    col_lower = col_name.lower()
    return any(kw in col_lower for kw in date_keywords)


def _looks_like_id(col_name: str, series: Any, total_rows: int) -> bool:
    """
    Heuristic: column name ends with 'id' and has high cardinality (near 100% unique).
    """
    col_lower = col_name.lower()
    is_id_name = col_lower.endswith('id') or col_lower.startswith('id') or col_lower == 'id'
    if not is_id_name:
        return False
    unique_ratio = series.nunique(dropna=True) / total_rows if total_rows > 0 else 0
    return unique_ratio > 0.9


def _compute_quality_score(df: Any, columns_info: List[Dict], duplicate_rows: int, total_rows: int) -> float:
    """
    Composite quality score (0–1):
      - 40%: average non-null rate across columns
      - 30%: penalty for duplicate rows
      - 30%: proportion of columns with high mapping confidence
    """
    if total_rows == 0:
        return 0.0

    # Component 1: completeness (non-null rate)
    total_cells = total_rows * len(columns_info)
    total_nulls = sum(c['nullCount'] for c in columns_info)
    completeness = 1.0 - (total_nulls / total_cells) if total_cells > 0 else 0.0

    # Component 2: uniqueness (penalise duplicates)
    uniqueness = 1.0 - (duplicate_rows / total_rows)

    # Component 3: mapping confidence
    high_confidence_cols = sum(
        1 for c in columns_info if c['confidenceLevel'] == 'high_confidence'
    )
    mapping_score = high_confidence_cols / len(columns_info) if columns_info else 0.0

    return 0.40 * completeness + 0.30 * uniqueness + 0.30 * mapping_score


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ('true', '1', 'yes')
    if isinstance(value, (int, float)):
        return bool(value)
    return False
