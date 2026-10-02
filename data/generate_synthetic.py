"""
Synthetic Data Generator — Campus Guardian 360
===============================================
Generates 1500+ realistic campus grievance records with embedded hidden patterns.

Usage:
    python data/generate_synthetic.py

Output:
    data/campus_grievances_historical.csv
"""

import csv
import os
import random
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Seed for reproducibility
# ---------------------------------------------------------------------------
random.seed(42)

# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------
DEPARTMENTS = [
    'Computer Science', 'Electronics', 'Mechanical', 'Civil',
    'Chemical', 'Mathematics', 'Physics', 'Management',
]

USER_TYPES = ['student', 'faculty', 'staff']
USER_TYPE_WEIGHTS = [0.70, 0.18, 0.12]

SEVERITIES = ['Low', 'Medium', 'High', 'Critical']
SEVERITY_WEIGHTS = [0.30, 0.40, 0.20, 0.10]

STATUSES = ['Submitted', 'Under Review', 'In Progress', 'Resolved', 'Closed']
STATUS_WEIGHTS = [0.20, 0.15, 0.20, 0.35, 0.10]

CATEGORIES = [
    'Academic', 'Infrastructure', 'Network/IT', 'Hostel', 'Transport',
    'Electricity', 'Water/Sanitation', 'Library', 'Canteen',
    'Maintenance', 'Harassment', 'Bullying', 'Ragging',
    'Discrimination', 'Safety', 'Other',
]

# ---------------------------------------------------------------------------
# Pattern descriptions (varied wording, same underlying issue)
# ---------------------------------------------------------------------------

PATTERN_A_DESCRIPTIONS = [
    'Hostel WiFi becomes very slow in the evening',
    'Internet speed drops drastically at night in hostel',
    'Network connectivity in hostel is extremely poor after 6pm',
    'WiFi keeps disconnecting in my hostel room',
    'Internet not working properly in hostel during evening hours',
    'Hostel network is almost unusable at night',
    'Very poor internet speed in Boys Hostel after 5pm',
    'WiFi signal is weak and unstable in hostel',
    'Cannot access internet from hostel room in the evening',
    'Network issues persist in hostel, reported multiple times',
    'The internet bandwidth in hostel is severely throttled after sunset',
    'My hostel room has no WiFi signal after 7pm every day',
]

PATTERN_B_DESCRIPTIONS = [
    'Frequent power cuts in Block C classrooms are disrupting lectures',
    'Lights keep flickering in Block C during lab sessions',
    'Electrical wiring in Block C looks damaged and poses a safety hazard',
    'Power supply in Block C cuts off multiple times a day',
    'The electricity in Block C Lab trips without warning',
    'Faulty wiring in Block C caused a short circuit last week',
    'We experience load shedding only in Block C every afternoon',
    'Block C classroom fans and lights stop working randomly',
    'The main electrical panel in Block C needs urgent maintenance',
]

PATTERN_C_DESCRIPTIONS = [
    'Bus on Route 3 is always late by 30 to 45 minutes',
    'Route 3 bus is severely overcrowded every morning',
    'The college bus on Route 3 frequently breaks down',
    'Route 3 bus skips stops without any prior notice',
    'Students waiting for Route 3 bus are stranded for over an hour',
    'Bus driver on Route 3 drives rashly and it is very unsafe',
    'Route 3 has too few buses for the number of students',
    'Route 3 bus schedule has not been updated for months',
    'We missed exams because Route 3 bus was cancelled without notification',
]

PATTERN_D_DESCRIPTIONS = [
    'No water supply in the hostel from midnight to 6am',
    'Hostel bathrooms have intermittent water availability',
    'Water pressure in hostel is too low to use showers',
    'Drinking water supply in hostel corridor taps is inconsistent',
    'The overhead water tank in hostel is not being filled regularly',
    'Hostel water supply is completely cut off during weekends',
    'Water leaking from pipes in hostel basement for over two weeks',
    'Sanitation in hostel is poor due to water shortage',
    'Hostel water supply disrupted due to maintenance without prior notice',
    'Hot water facility in hostel is non-functional during winter mornings',
]

PATTERN_E_DESCRIPTIONS = [
    'Second year CS students are not getting study materials on time',
    'The syllabus for second year CS subjects was not updated this semester',
    'CS department year 2 lab slots keep changing without notice',
    'Faculty for second year Computer Science subjects is frequently absent',
    'Internal assessment marks for second year CS batch were not uploaded',
    'No feedback session was held for second year CS students this term',
    'Year 2 CS students have excessive workload with overlapping assignments',
    'Mid-semester exams clashed for second year CS department students',
    'The project guidelines for second year CS course are unclear',
]

PATTERN_F_DESCRIPTIONS = [
    'A group of seniors is creating a hostile environment for juniors',
    'Inappropriate behavior was noticed near the canteen area',
    'Verbal harassment occurred in a common area on campus',
    'Some individuals are targeting students from a specific background',
    'There is ongoing bullying in the hostel common room',
    'Intimidation and threats were made during an event on campus',
]

# Random descriptions for filler records
RANDOM_DESCRIPTIONS = {
    'Academic': [
        'Professor is not available during office hours',
        'Timetable clashes are causing attendance issues',
        'Lab equipment is outdated and insufficient for practicals',
        'Exam hall was too crowded and uncomfortable',
        'Course curriculum has not been revised in years',
        'Attendance records show errors in the portal',
    ],
    'Infrastructure': [
        'Benches in the main auditorium are broken',
        'Elevator in the admin block is out of order',
        'Roof of the old building is leaking during rains',
        'Pathway between departments is flooded after rain',
        'Parking area is insufficient and poorly organized',
    ],
    'Network/IT': [
        'Campus Wi-Fi password was changed without informing students',
        'Computer lab systems frequently crash during practical exams',
        'Student portal is unavailable on mobile browsers',
        'Library computers are very slow and outdated',
        'Printing facility in computer lab has been non-functional for a week',
    ],
    'Hostel': [
        'Hostel rooms have insufficient lighting',
        'Hostel mess food quality has declined significantly',
        'Common room TV has been broken for over a month',
        'Hostel curfew rules are being applied inconsistently',
        'Pest infestation noticed in hostel rooms',
    ],
    'Transport': [
        'College bus is not air-conditioned and it is very hot',
        'Bus timings are not aligned with class schedules',
        'Bus driver is rude to students',
        'Shuttle service between campus buildings has been discontinued',
    ],
    'Electricity': [
        'Streetlights near the sports complex do not work at night',
        'Power outlets in the library are insufficient',
        'Generator backup is slow during power outages',
        'Electrical board near the canteen looks dangerous',
    ],
    'Water/Sanitation': [
        'Washrooms near the auditorium are not cleaned regularly',
        'Water cooler on second floor of academic block is not working',
        'Drainage in the main corridor gets clogged after rain',
    ],
    'Library': [
        'New edition textbooks are not available in the library',
        'Library is too noisy to study in',
        'Library timings do not accommodate evening students',
        'Some reference books are always checked out and unavailable',
    ],
    'Canteen': [
        'Canteen food prices have increased without any notice',
        'Canteen hygiene standards need improvement',
        'Vending machines in canteen are frequently out of stock',
        'Canteen is too crowded during lunch break',
    ],
    'Maintenance': [
        'Paint is peeling off walls in the main corridor',
        'Door handles in classrooms are broken',
        'Air conditioning in department seminar hall is not working',
        'Window panes in the library reading room are broken',
    ],
    'Safety': [
        'Security camera near the parking lot is not functioning',
        'Campus gate security check is not thorough after 9pm',
        'Fire extinguishers in labs have not been inspected this year',
    ],
    'Other': [
        'Student ID card issuance is taking too long',
        'Communication from admin about events is unclear',
        'Campus events are not announced with sufficient advance notice',
    ],
}

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def weighted_choice(options, weights):
    return random.choices(options, weights=weights, k=1)[0]

def random_user():
    return 'user_' + str(random.randint(1000, 9999))

def random_date_last_12_months():
    """Return a random datetime in the last 12 months."""
    now = datetime.now()
    start = now - timedelta(days=365)
    delta = now - start
    random_seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=random_seconds)

def evening_date():
    """Return a random datetime in the last 12 months with time between 17:00 and 23:00."""
    base = random_date_last_12_months()
    evening_hour = random.randint(17, 22)
    evening_minute = random.randint(0, 59)
    return base.replace(hour=evening_hour, minute=evening_minute, second=random.randint(0, 59))

def outcome_for_status(status):
    if status == 'Resolved':
        return random.choice([
            'Issue resolved after maintenance team intervention',
            'Problem fixed following department review',
            'Corrective action taken and verified',
            'Resolved after escalation to concerned authority',
            'Issue addressed and closed by department',
        ])
    elif status == 'Closed':
        return random.choice([
            'Closed without further action required',
            'Issue closed after investigation found no violation',
            'Withdrawn by submitter',
        ])
    return ''

def sentiment_for_description(description):
    neg_words = ['slow', 'poor', 'bad', 'broken', 'not working', 'unusable', 'faulty',
                 'damaged', 'insufficient', 'dirty', 'crowded', 'overcrowded', 'late',
                 'absent', 'harassment', 'bullying', 'hostile', 'unsafe', 'dangerous',
                 'rude', 'cut off', 'no water', 'no electricity', 'outage', 'clogged',
                 'non-functional', 'expired', 'cancelled', 'stranded', 'flood',
                 'inconsistent', 'delay', 'error', 'rash', 'crack', 'peel', 'pest',
                 'leaking', 'short circuit', 'threat', 'intimidation', 'inappropriate']
    desc_lower = description.lower()
    for word in neg_words:
        if word in desc_lower:
            return 'negative'
    return 'neutral'

# ---------------------------------------------------------------------------
# Record builder functions per pattern
# ---------------------------------------------------------------------------

def build_pattern_a(n):
    """Hostel Network Issues — evening pattern."""
    records = []
    hostel_locations = ['Boys Hostel A', 'Girls Hostel B', 'Hostel C']
    for _ in range(n):
        status = weighted_choice(STATUSES, STATUS_WEIGHTS)
        desc = random.choice(PATTERN_A_DESCRIPTIONS)
        records.append({
            'category': 'Network/IT',
            'location': random.choice(hostel_locations),
            'description': desc,
            'severity': weighted_choice(SEVERITIES, SEVERITY_WEIGHTS),
            'department': random.choice(DEPARTMENTS),
            'year': random.randint(1, 4),
            'userType': weighted_choice(USER_TYPES, USER_TYPE_WEIGHTS),
            'anonymous': False,
            'status': status,
            'outcome': outcome_for_status(status),
            'sentiment': sentiment_for_description(desc),
            'createdAt': evening_date(),
        })
    return records

def build_pattern_b(n):
    """Electrical Issues — Block C."""
    records = []
    block_locations = ['Block C', 'Block C Lab', 'Block C Classroom']
    for _ in range(n):
        status = weighted_choice(STATUSES, STATUS_WEIGHTS)
        desc = random.choice(PATTERN_B_DESCRIPTIONS)
        records.append({
            'category': 'Electricity',
            'location': random.choice(block_locations),
            'description': desc,
            'severity': weighted_choice(SEVERITIES, SEVERITY_WEIGHTS),
            'department': random.choice(DEPARTMENTS),
            'year': random.randint(1, 4),
            'userType': weighted_choice(USER_TYPES, USER_TYPE_WEIGHTS),
            'anonymous': False,
            'status': status,
            'outcome': outcome_for_status(status),
            'sentiment': sentiment_for_description(desc),
            'createdAt': random_date_last_12_months(),
        })
    return records

def build_pattern_c(n):
    """Transport — Route 3 issues."""
    records = []
    transport_locations = ['Transport Area', 'Main Gate Bus Stop', 'Route 3 Stop']
    for _ in range(n):
        status = weighted_choice(STATUSES, STATUS_WEIGHTS)
        desc = random.choice(PATTERN_C_DESCRIPTIONS)
        records.append({
            'category': 'Transport',
            'location': random.choice(transport_locations),
            'description': desc,
            'severity': weighted_choice(SEVERITIES, SEVERITY_WEIGHTS),
            'department': random.choice(DEPARTMENTS),
            'year': random.randint(1, 4),
            'userType': weighted_choice(USER_TYPES, USER_TYPE_WEIGHTS),
            'anonymous': False,
            'status': status,
            'outcome': outcome_for_status(status),
            'sentiment': sentiment_for_description(desc),
            'createdAt': random_date_last_12_months(),
        })
    return records

def build_pattern_d(n):
    """Hostel Water/Sanitation Problems."""
    records = []
    hostel_locations = ['Boys Hostel A', 'Girls Hostel B', 'Hostel C', 'Hostel D', 'New Hostel Block']
    for _ in range(n):
        status = weighted_choice(STATUSES, STATUS_WEIGHTS)
        desc = random.choice(PATTERN_D_DESCRIPTIONS)
        records.append({
            'category': 'Water/Sanitation',
            'location': random.choice(hostel_locations),
            'description': desc,
            'severity': weighted_choice(SEVERITIES, SEVERITY_WEIGHTS),
            'department': random.choice(DEPARTMENTS),
            'year': random.randint(1, 4),
            'userType': weighted_choice(USER_TYPES, USER_TYPE_WEIGHTS),
            'anonymous': False,
            'status': status,
            'outcome': outcome_for_status(status),
            'sentiment': sentiment_for_description(desc),
            'createdAt': random_date_last_12_months(),
        })
    return records

def build_pattern_e(n):
    """Academic Issues — CS Dept Year 2."""
    records = []
    for _ in range(n):
        status = weighted_choice(STATUSES, STATUS_WEIGHTS)
        desc = random.choice(PATTERN_E_DESCRIPTIONS)
        records.append({
            'category': 'Academic',
            'location': 'Computer Science Department',
            'description': desc,
            'severity': weighted_choice(SEVERITIES, SEVERITY_WEIGHTS),
            'department': 'Computer Science',
            'year': 2,
            'userType': 'student',
            'anonymous': False,
            'status': status,
            'outcome': outcome_for_status(status),
            'sentiment': sentiment_for_description(desc),
            'createdAt': random_date_last_12_months(),
        })
    return records

def build_pattern_f(n):
    """Anonymous Harassment / Bullying."""
    records = []
    for _ in range(n):
        status = weighted_choice(['Submitted', 'Under Review', 'In Progress', 'Resolved'],
                                  [0.30, 0.30, 0.25, 0.15])
        desc = random.choice(PATTERN_F_DESCRIPTIONS)
        category = random.choice(['Harassment', 'Bullying'])
        records.append({
            'category': category,
            'location': random.choice(['Campus Common Area', 'Hostel', 'Canteen', 'Near Library', 'Not Applicable']),
            'description': desc,
            'severity': weighted_choice(['Low', 'Medium', 'High', 'Critical'], [0.10, 0.25, 0.40, 0.25]),
            'department': random.choice(DEPARTMENTS),
            'year': random.randint(1, 4),
            'userType': 'student',
            'anonymous': True,
            'status': status,
            'outcome': outcome_for_status(status),
            'sentiment': 'negative',
            'createdAt': random_date_last_12_months(),
        })
    return records

def build_random_filler(n):
    """Random records across all non-sensitive categories."""
    records = []
    filler_categories = [c for c in CATEGORIES if c not in ('Harassment', 'Bullying', 'Ragging', 'Discrimination', 'Safety')]
    for _ in range(n):
        cat = random.choice(filler_categories)
        cat_descs = RANDOM_DESCRIPTIONS.get(cat, RANDOM_DESCRIPTIONS['Other'])
        desc = random.choice(cat_descs)
        status = weighted_choice(STATUSES, STATUS_WEIGHTS)
        records.append({
            'category': cat,
            'location': random.choice([
                'Main Building', 'Academic Block A', 'Academic Block B', 'Library',
                'Canteen', 'Sports Complex', 'Auditorium', 'Admin Block',
                'Workshop', 'Seminar Hall', 'Not Applicable',
            ]),
            'description': desc,
            'severity': weighted_choice(SEVERITIES, SEVERITY_WEIGHTS),
            'department': random.choice(DEPARTMENTS),
            'year': random.randint(1, 4),
            'userType': weighted_choice(USER_TYPES, USER_TYPE_WEIGHTS),
            'anonymous': False,
            'status': status,
            'outcome': outcome_for_status(status),
            'sentiment': sentiment_for_description(desc),
            'createdAt': random_date_last_12_months(),
        })
    return records

# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------

def generate():
    records = []

    # Pattern records
    records.extend(build_pattern_a(300))   # Hostel Network
    records.extend(build_pattern_b(200))   # Block C Electricity
    records.extend(build_pattern_c(150))   # Transport Route 3
    records.extend(build_pattern_d(200))   # Hostel Water
    records.extend(build_pattern_e(150))   # Academic CS Year 2
    records.extend(build_pattern_f(100))   # Anonymous Harassment

    # Filler to reach 1500+
    filler_needed = 1500 - len(records)
    records.extend(build_random_filler(filler_needed + 50))  # slight buffer → ~1650 total

    # Shuffle to hide patterns from naive sequential reading
    random.shuffle(records)

    # Assign sequential IDs
    for idx, rec in enumerate(records, start=1):
        rec['id'] = f'HIST-{idx:05d}'
        rec['submittedBy'] = 'user_' + str(random.randint(1000, 9999))
        # Format datetime as ISO string
        rec['createdAt'] = rec['createdAt'].strftime('%Y-%m-%dT%H:%M:%S')

    return records

# ---------------------------------------------------------------------------
# Write CSV
# ---------------------------------------------------------------------------

FIELDNAMES = [
    'id', 'submittedBy', 'anonymous', 'category', 'location',
    'description', 'severity', 'department', 'year', 'userType',
    'createdAt', 'status', 'sentiment', 'outcome',
]

def main():
    # Resolve output path relative to this script's location or data/ dir
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, 'campus_grievances_historical.csv')

    records = generate()

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        for rec in records:
            row = {field: rec.get(field, '') for field in FIELDNAMES}
            writer.writerow(row)

    print(f'[generate_synthetic] Wrote {len(records)} records to {output_path}')

if __name__ == '__main__':
    main()
