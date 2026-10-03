/**
 * mockData.js
 * -----------
 * Realistic mock data used as fallback when the backend is not running.
 * All pages import this and use it when API calls fail.
 */

export const MOCK_STATS = {
  totalGrievances: 1550,
  pendingGrievances: 312,
  resolvedGrievances: 987,
  activePatterns: 6,
  pendingActions: 3,
  outcomesMeasured: 4,
};

export const MOCK_CATEGORY_DATA = [
  { name: 'Network/IT', count: 342 },
  { name: 'Hostel', count: 287 },
  { name: 'Electricity', count: 214 },
  { name: 'Transport', count: 178 },
  { name: 'Academic', count: 156 },
  { name: 'Water/Sanitation', count: 143 },
  { name: 'Maintenance', count: 98 },
  { name: 'Canteen', count: 72 },
  { name: 'Harassment', count: 60 },
];

export const MOCK_WEEKLY_TREND = [
  { week: 'W1', count: 28 },
  { week: 'W2', count: 35 },
  { week: 'W3', count: 42 },
  { week: 'W4', count: 38 },
  { week: 'W5', count: 51 },
  { week: 'W6', count: 47 },
  { week: 'W7', count: 63 },
  { week: 'W8', count: 71 },
  { week: 'W9', count: 68 },
  { week: 'W10', count: 84 },
  { week: 'W11', count: 79 },
  { week: 'W12', count: 92 },
];

export const MOCK_SEVERITY_DATA = [
  { name: 'Low', count: 310 },
  { name: 'Medium', count: 620 },
  { name: 'High', count: 465 },
  { name: 'Critical', count: 155 },
];

export const MOCK_GRIEVANCES = [
  { _id: 'g1', trackingCode: 'GR-A1B2C3', category: 'Network/IT', rawSeverity: 'High', status: 'Under Review', createdAt: '2024-11-01T18:32:00', description: 'Hostel WiFi is extremely slow every evening after 6 PM', submittedBy: { name: 'Rahul Kumar' }, location: { building: 'Boys Hostel A' } },
  { _id: 'g2', trackingCode: 'GR-D4E5F6', category: 'Electricity', rawSeverity: 'Critical', status: 'In Progress', createdAt: '2024-11-02T10:15:00', description: 'Frequent power cuts in Block C classrooms disrupting lectures', submittedBy: { name: 'Priya Sharma' }, location: { building: 'Block C' } },
  { _id: 'g3', trackingCode: 'GR-G7H8I9', category: 'Transport', rawSeverity: 'Medium', status: 'Submitted', createdAt: '2024-11-03T08:45:00', description: 'Route 3 bus is always late by 30 to 45 minutes', submittedBy: { name: 'Amit Patel' }, location: { building: 'Main Gate Bus Stop' } },
  { _id: 'g4', trackingCode: 'GR-J1K2L3', category: 'Water/Sanitation', rawSeverity: 'High', status: 'Resolved', createdAt: '2024-11-04T07:20:00', description: 'No water supply in hostel from midnight to 6 AM', submittedBy: { name: 'Sneha Nair' }, location: { building: 'Girls Hostel B' } },
  { _id: 'g5', trackingCode: 'GR-M4N5O6', category: 'Academic', rawSeverity: 'Medium', status: 'Under Review', createdAt: '2024-11-05T11:30:00', description: 'Second year CS students not getting study materials on time', submittedBy: { name: 'Vikram Singh' }, location: { building: 'CS Department' } },
  { _id: 'g6', trackingCode: 'GR-P7Q8R9', category: 'Network/IT', rawSeverity: 'High', status: 'Submitted', createdAt: '2024-11-06T19:10:00', description: 'Internet disconnects frequently in hostel room at night', submittedBy: { name: 'Ananya Roy' }, location: { building: 'Boys Hostel A' } },
  { _id: 'g7', trackingCode: 'GR-S1T2U3', category: 'Canteen', rawSeverity: 'Low', status: 'Closed', createdAt: '2024-11-07T12:00:00', description: 'Canteen food prices increased without notice', submittedBy: { name: 'Kiran Reddy' }, location: { building: 'Canteen' } },
  { _id: 'g8', trackingCode: 'GR-V4W5X6', category: 'Harassment', rawSeverity: 'Critical', status: 'Under Review', createdAt: '2024-11-08T14:25:00', description: 'Anonymous', submittedBy: null, location: { building: 'Hostel Common Room' }, anonymous: true, isSensitive: true },
];

export const MOCK_PATTERNS = [
  {
    _id: 'p1',
    patternKey: 'network-hostel-001',
    title: 'Network/IT — Hostel (wifi, slow, evening)',
    description: 'Repeated reports of slow or unstable WiFi connectivity in hostel areas, concentrated during evening hours. Multiple students from different departments reported similar issues with different wording.',
    category: 'Network/IT',
    primaryLocation: 'Boys Hostel A',
    locations: ['Boys Hostel A', 'Girls Hostel B', 'Hostel C'],
    reportCount: 342,
    status: 'active',
    responsibleDepartment: 'Network / IT',
    avgUrgency: 0.74,
    topKeywords: ['wifi', 'slow', 'hostel', 'evening', 'internet', 'disconnect'],
    timeRange: 'Last 45 days',
    severityDistribution: { Low: 45, Medium: 162, High: 108, Critical: 27 },
    sentimentDistribution: { Positive: 12, Neutral: 68, Negative: 262 },
    prediction: { trend: 'Increasing', confidence: 0.84, slope: 3.2 },
    recommendation: {
      suggestedAction: 'Inspect hostel access-point coverage and peak-hour network capacity',
      confidence: 0.82,
    },
    diagnosis: {
      summary: 'Data shows 78% of related reports occurred between 6 PM and 10 PM. Complaint frequency has increased over the last 4 weeks.',
      possibleFactors: ['Peak-time network capacity', 'Insufficient access points in hostel blocks', 'Bandwidth throttling during evening hours'],
    },
    evidence: [
      { text: 'Hostel WiFi is extremely slow every evening', similarity: 0.96 },
      { text: 'Internet speed drops drastically at night in hostel', similarity: 0.94 },
      { text: 'Network connectivity in hostel is very poor after 6pm', similarity: 0.92 },
    ],
    weeklyTrend: [
      { week: 'W1', count: 18 }, { week: 'W2', count: 27 },
      { week: 'W3', count: 41 }, { week: 'W4', count: 56 },
      { week: 'W5', count: 63 }, { week: 'W6', count: 71 },
    ],
  },
  {
    _id: 'p2',
    patternKey: 'electricity-blockc-001',
    title: 'Electricity — Block C (power, cuts, flickering)',
    description: 'Concentrated reports of electrical issues in Block C including power cuts, flickering lights, and faulty wiring. Issues affect multiple classrooms and labs.',
    category: 'Electricity',
    primaryLocation: 'Block C',
    locations: ['Block C', 'Block C Lab', 'Block C Classroom'],
    reportCount: 214,
    status: 'active',
    responsibleDepartment: 'Electrical',
    avgUrgency: 0.81,
    topKeywords: ['power', 'block c', 'electricity', 'flicker', 'wiring', 'outage'],
    timeRange: 'Last 30 days',
    severityDistribution: { Low: 21, Medium: 64, High: 86, Critical: 43 },
    sentimentDistribution: { Positive: 5, Neutral: 42, Negative: 167 },
    prediction: { trend: 'Stable', confidence: 0.71, slope: 0.4 },
    recommendation: {
      suggestedAction: 'Inspect Block C electrical wiring and main distribution panel',
      confidence: 0.88,
    },
    diagnosis: {
      summary: 'Data shows 92% of reports are concentrated in Block C. Issues occur across multiple floors and classrooms.',
      possibleFactors: ['Aged electrical wiring', 'Overloaded distribution panel', 'Insufficient maintenance'],
    },
    evidence: [
      { text: 'Frequent power cuts in Block C classrooms disrupting lectures', similarity: 0.97 },
      { text: 'Lights keep flickering in Block C during lab sessions', similarity: 0.93 },
      { text: 'Electrical wiring in Block C looks damaged', similarity: 0.91 },
    ],
    weeklyTrend: [
      { week: 'W1', count: 32 }, { week: 'W2', count: 38 },
      { week: 'W3', count: 35 }, { week: 'W4', count: 41 },
      { week: 'W5', count: 37 }, { week: 'W6', count: 31 },
    ],
  },
  {
    _id: 'p3',
    patternKey: 'transport-route3-001',
    title: 'Transport — Route 3 (bus, late, overcrowded)',
    description: 'Repeated complaints about Route 3 bus being late, overcrowded, and frequently breaking down. Students are missing classes due to unreliable transport.',
    category: 'Transport',
    primaryLocation: 'Main Gate Bus Stop',
    locations: ['Main Gate Bus Stop', 'Transport Area', 'Route 3 Stop'],
    reportCount: 178,
    status: 'active',
    responsibleDepartment: 'Transport',
    avgUrgency: 0.67,
    topKeywords: ['route 3', 'bus', 'late', 'overcrowded', 'delay', 'breakdown'],
    timeRange: 'Last 60 days',
    severityDistribution: { Low: 35, Medium: 89, High: 43, Critical: 11 },
    sentimentDistribution: { Positive: 8, Neutral: 52, Negative: 118 },
    prediction: { trend: 'Decreasing', confidence: 0.65, slope: -1.2 },
    recommendation: {
      suggestedAction: 'Review Route 3 schedule and add additional buses during peak hours',
      confidence: 0.75,
    },
    diagnosis: {
      summary: 'Data shows complaints are concentrated during morning (7-9 AM) and evening (5-7 PM) hours. Frequency has slightly decreased over the last 2 weeks.',
      possibleFactors: ['Insufficient fleet size for Route 3', 'Poor schedule adherence', 'Vehicle maintenance issues'],
    },
    evidence: [
      { text: 'Bus on Route 3 is always late by 30 to 45 minutes', similarity: 0.95 },
      { text: 'Route 3 bus is severely overcrowded every morning', similarity: 0.92 },
      { text: 'The college bus on Route 3 frequently breaks down', similarity: 0.90 },
    ],
    weeklyTrend: [
      { week: 'W1', count: 41 }, { week: 'W2', count: 38 },
      { week: 'W3', count: 33 }, { week: 'W4', count: 29 },
      { week: 'W5', count: 24 }, { week: 'W6', count: 13 },
    ],
  },
  {
    _id: 'p4',
    patternKey: 'water-hostel-001',
    title: 'Water/Sanitation — Hostel (water supply, shortage)',
    description: 'Intermittent water supply issues across hostel blocks, particularly during late night and early morning hours.',
    category: 'Water/Sanitation',
    primaryLocation: 'Boys Hostel A',
    locations: ['Boys Hostel A', 'Girls Hostel B', 'Hostel C', 'Hostel D'],
    reportCount: 143,
    status: 'monitoring',
    responsibleDepartment: 'Hostel Administration',
    avgUrgency: 0.69,
    topKeywords: ['water', 'hostel', 'supply', 'shortage', 'midnight', 'tank'],
    timeRange: 'Last 30 days',
    severityDistribution: { Low: 28, Medium: 57, High: 43, Critical: 15 },
    sentimentDistribution: { Positive: 9, Neutral: 38, Negative: 96 },
    prediction: { trend: 'Recurrence Risk', confidence: 0.72, slope: 1.8 },
    recommendation: {
      suggestedAction: 'Inspect hostel water tank filling schedule and pipe infrastructure',
      confidence: 0.79,
    },
    diagnosis: {
      summary: 'Data shows water supply interruptions concentrated between 12 AM and 6 AM. Pattern has recurred after a brief resolution period.',
      possibleFactors: ['Overhead tank not refilled regularly', 'Pipe leakage in hostel basement', 'Water pressure issues'],
    },
    evidence: [
      { text: 'No water supply in the hostel from midnight to 6am', similarity: 0.96 },
      { text: 'Hostel bathrooms have intermittent water availability', similarity: 0.91 },
      { text: 'Water pressure in hostel is too low to use showers', similarity: 0.89 },
    ],
    weeklyTrend: [
      { week: 'W1', count: 22 }, { week: 'W2', count: 31 },
      { week: 'W3', count: 18 }, { week: 'W4', count: 12 },
      { week: 'W5', count: 19 }, { week: 'W6', count: 28 },
    ],
  },
  {
    _id: 'p5',
    patternKey: 'academic-cs-y2-001',
    title: 'Academic — CS Year 2 (materials, syllabus, faculty)',
    description: 'Second year Computer Science students reporting consistent issues with study materials, faculty availability, and syllabus updates.',
    category: 'Academic',
    primaryLocation: 'Computer Science Department',
    locations: ['Computer Science Department', 'CS Lab', 'Seminar Hall'],
    reportCount: 156,
    status: 'active',
    responsibleDepartment: 'Academic Administration',
    avgUrgency: 0.58,
    topKeywords: ['cs', 'year 2', 'materials', 'syllabus', 'faculty', 'absent'],
    timeRange: 'Last 45 days',
    severityDistribution: { Low: 46, Medium: 78, High: 28, Critical: 4 },
    sentimentDistribution: { Positive: 14, Neutral: 67, Negative: 75 },
    prediction: { trend: 'Stable', confidence: 0.68, slope: 0.2 },
    recommendation: {
      suggestedAction: 'Review CS Year 2 curriculum delivery and faculty attendance records',
      confidence: 0.71,
    },
    diagnosis: {
      summary: 'Data shows 94% of reports are from Year 2 CS students. Issues are distributed across the semester without a specific peak time.',
      possibleFactors: ['Curriculum update delays', 'Faculty workload imbalance', 'Student-faculty communication gaps'],
    },
    evidence: [
      { text: 'Second year CS students are not getting study materials on time', similarity: 0.95 },
      { text: 'Faculty for second year Computer Science subjects is frequently absent', similarity: 0.92 },
      { text: 'Internal assessment marks for second year CS batch were not uploaded', similarity: 0.88 },
    ],
    weeklyTrend: [
      { week: 'W1', count: 24 }, { week: 'W2', count: 28 },
      { week: 'W3', count: 26 }, { week: 'W4', count: 31 },
      { week: 'W5', count: 24 }, { week: 'W6', count: 23 },
    ],
  },
  {
    _id: 'p6',
    patternKey: 'harassment-anon-001',
    title: 'Harassment/Bullying — Campus (anonymous reports)',
    description: 'Anonymous reports of harassment and bullying incidents in campus common areas and hostel.',
    category: 'Harassment',
    primaryLocation: 'Campus Common Area',
    locations: ['Campus Common Area', 'Hostel', 'Canteen', 'Near Library'],
    reportCount: 60,
    status: 'active',
    responsibleDepartment: 'Student Welfare',
    avgUrgency: 0.88,
    topKeywords: ['harassment', 'bullying', 'hostel', 'seniors', 'hostile'],
    timeRange: 'Last 90 days',
    severityDistribution: { Low: 6, Medium: 15, High: 24, Critical: 15 },
    sentimentDistribution: { Positive: 0, Neutral: 12, Negative: 48 },
    prediction: { trend: 'Emerging', confidence: 0.77, slope: 2.1 },
    recommendation: {
      suggestedAction: 'Initiate confidential investigation and awareness campaign',
      confidence: 0.85,
    },
    diagnosis: {
      summary: 'Data shows 100% of reports in this pattern are anonymous. Incidents are spread across hostel and common areas.',
      possibleFactors: ['Fear of retaliation preventing open reporting', 'Insufficient awareness of grievance channels', 'Cultural factors'],
    },
    evidence: [
      { text: 'A group of seniors is creating a hostile environment for juniors', similarity: 0.94 },
      { text: 'Verbal harassment occurred in a common area on campus', similarity: 0.91 },
      { text: 'Ongoing bullying in the hostel common room', similarity: 0.89 },
    ],
    weeklyTrend: [
      { week: 'W1', count: 4 }, { week: 'W2', count: 6 },
      { week: 'W3', count: 8 }, { week: 'W4', count: 11 },
      { week: 'W5', count: 14 }, { week: 'W6', count: 17 },
    ],
  },
];

export const MOCK_ACTIONS = [
  {
    _id: 'a1',
    actionNumber: 'ACT-20241101-0001',
    patternId: { _id: 'p1', title: 'Network/IT — Hostel (wifi, slow, evening)' },
    actionTitle: 'Hostel Network Infrastructure Inspection',
    approvalStatus: 'Pending Approval',
    actionStatus: 'Recommended',
    recommendedDepartment: 'Network / IT',
    createdAt: '2024-11-10T09:00:00',
    emailDraft: {
      subject: 'Action Required: Recurring Hostel Network Connectivity Issue',
      body: `Dear IT Head,\n\nOur campus grievance analysis identified a recurring network connectivity issue in the hostel.\n\nReports: 342\nAnalysis period: Last 45 days\nPrimary location: Hostel\nPeak occurrence: 6 PM – 10 PM\n\nObserved pattern:\nMultiple students reported unstable or slow connectivity during evening hours.\n\nRecommended action:\nInspect hostel access-point coverage and peak-hour capacity.\n\nPlease review and provide an update.\n\nRegards,\nCampus Guardian 360`,
      deliveryMethod: 'draft_only',
    },
    originalRecommendation: {
      problem: 'Hostel network instability',
      observedPattern: 'Repeated evening complaints',
      evidence: '342 related complaints in 45 days',
      possibleFactors: ['Peak-time network capacity', 'Insufficient access points'],
      suggestedAction: 'Inspect hostel access-point coverage and peak-hour network capacity',
      confidence: 0.82,
    },
  },
  {
    _id: 'a2',
    actionNumber: 'ACT-20241102-0002',
    patternId: { _id: 'p2', title: 'Electricity — Block C (power, cuts, flickering)' },
    actionTitle: 'Block C Electrical Safety Inspection',
    approvalStatus: 'Approved',
    actionStatus: 'In Progress',
    recommendedDepartment: 'Electrical',
    approvedBy: { name: 'Admin User' },
    approvalDate: '2024-11-05T14:30:00',
    approvalComments: 'Approved. Schedule inspection within 48 hours.',
    createdAt: '2024-11-03T10:00:00',
    emailDraft: {
      subject: 'Action Required: Block C Electrical Infrastructure Issues',
      body: `Dear Electrical Head,\n\nOur analysis identified concentrated electrical issues in Block C.\n\nReports: 214\nPrimary location: Block C\n\nRecommended action:\nInspect Block C electrical wiring and main distribution panel.\n\nRegards,\nCampus Guardian 360`,
      deliveryMethod: 'draft_only',
    },
    originalRecommendation: {
      problem: 'Block C electrical failures',
      observedPattern: 'Concentrated power cuts and flickering',
      evidence: '214 related complaints in 30 days',
      possibleFactors: ['Aged wiring', 'Overloaded panel'],
      suggestedAction: 'Inspect Block C electrical wiring and main distribution panel',
      confidence: 0.88,
    },
  },
  {
    _id: 'a3',
    actionNumber: 'ACT-20241103-0003',
    patternId: { _id: 'p4', title: 'Water/Sanitation — Hostel (water supply, shortage)' },
    actionTitle: 'Hostel Water Supply Maintenance',
    approvalStatus: 'Approved',
    actionStatus: 'Resolved',
    recommendedDepartment: 'Hostel Administration',
    approvedBy: { name: 'Admin User' },
    approvalDate: '2024-10-15T11:00:00',
    resolutionDate: '2024-10-25T16:00:00',
    createdAt: '2024-10-12T09:00:00',
    emailDraft: {
      subject: 'Action Required: Hostel Water Supply Disruption',
      body: `Dear Hostel Warden,\n\nOur analysis identified recurring water supply issues in hostel blocks.\n\nRegards,\nCampus Guardian 360`,
      deliveryMethod: 'draft_only',
    },
    originalRecommendation: {
      suggestedAction: 'Inspect hostel water tank filling schedule and pipe infrastructure',
      confidence: 0.79,
    },
  },
];

export const MOCK_OUTCOMES = [
  {
    _id: 'o1',
    patternId: { _id: 'p4', title: 'Water/Sanitation — Hostel (water supply, shortage)' },
    actionId: { _id: 'a3', actionNumber: 'ACT-20241103-0003', actionTitle: 'Hostel Water Supply Maintenance' },
    measurementDate: '2024-11-01T00:00:00',
    beforeMetrics: { complaintCount: 143, averageSeverity: 2.4, sentimentScore: -0.62, frequency: 4.8 },
    afterMetrics: { complaintCount: 31, averageSeverity: 1.8, sentimentScore: -0.31, frequency: 1.0 },
    changeMetrics: { countChange: -112, countChangePct: -78.3, severityChange: -0.6, sentimentChange: 0.31, frequencyChange: -3.8 },
    observationText: 'Complaint frequency decreased by 78.3% in the observation period following the recorded intervention. Average severity also decreased. This change is consistent with a positive response, though other factors may also have contributed.',
    recurrenceStatus: 'possible',
  },
];

export const MOCK_DEPARTMENTS = [
  { _id: 'd1', name: 'Network / IT', code: 'IT', contactEmail: 'it@campus.edu', headName: 'Dr. Rajesh Kumar', slaHours: 24, active: true, issueTypes: ['Network/IT'] },
  { _id: 'd2', name: 'Maintenance', code: 'MAINT', contactEmail: 'maintenance@campus.edu', headName: 'Mr. Suresh Babu', slaHours: 48, active: true, issueTypes: ['Infrastructure', 'Maintenance'] },
  { _id: 'd3', name: 'Electrical', code: 'ELEC', contactEmail: 'electrical@campus.edu', headName: 'Mr. Venkat Rao', slaHours: 12, active: true, issueTypes: ['Electricity'] },
  { _id: 'd4', name: 'Hostel Administration', code: 'HOSTEL', contactEmail: 'hostel@campus.edu', headName: 'Dr. Meena Iyer', slaHours: 24, active: true, issueTypes: ['Hostel', 'Water/Sanitation'] },
  { _id: 'd5', name: 'Transport', code: 'TRANS', contactEmail: 'transport@campus.edu', headName: 'Mr. Anand Pillai', slaHours: 48, active: true, issueTypes: ['Transport'] },
  { _id: 'd6', name: 'Academic Administration', code: 'ACAD', contactEmail: 'academic@campus.edu', headName: 'Prof. Lakshmi Devi', slaHours: 72, active: true, issueTypes: ['Academic'] },
  { _id: 'd7', name: 'Student Welfare', code: 'SW', contactEmail: 'welfare@campus.edu', headName: 'Dr. Pradeep Nair', slaHours: 6, active: true, issueTypes: ['Harassment', 'Bullying', 'Ragging', 'Discrimination', 'Safety'] },
  { _id: 'd8', name: 'Security', code: 'SEC', contactEmail: 'security@campus.edu', headName: 'Mr. Raman Singh', slaHours: 2, active: true, issueTypes: ['Safety', 'Ragging'] },
  { _id: 'd9', name: 'Library', code: 'LIB', contactEmail: 'library@campus.edu', headName: 'Mrs. Sarala Devi', slaHours: 48, active: true, issueTypes: ['Library'] },
  { _id: 'd10', name: 'Canteen', code: 'CANT', contactEmail: 'canteen@campus.edu', headName: 'Mr. Mohan Das', slaHours: 24, active: true, issueTypes: ['Canteen'] },
];

export const MOCK_AUDIT_LOGS = [
  { _id: 'al1', userId: { name: 'Admin User' }, userRole: 'admin', actionType: 'APPROVE_ACTION', resourceType: 'Action', resourceId: 'ACT-20241102-0002', details: 'Action approved for Block C electrical inspection', ipAddress: '192.168.1.10', timestamp: '2024-11-05T14:30:00' },
  { _id: 'al2', userId: { name: 'Admin User' }, userRole: 'admin', actionType: 'PATTERN_REFRESH', resourceType: 'Pattern', resourceId: 'system', details: 'Pattern discovery initiated — 1550 grievances processed', ipAddress: '192.168.1.10', timestamp: '2024-11-04T10:15:00' },
  { _id: 'al3', userId: { name: 'Sensitive Officer' }, userRole: 'sensitive_officer', actionType: 'SENSITIVE_ACCESS', resourceType: 'Grievance', resourceId: 'GR-V4W5X6', details: 'Accessed sensitive grievance identity information', ipAddress: '192.168.1.22', timestamp: '2024-11-03T16:45:00' },
  { _id: 'al4', userId: { name: 'Admin User' }, userRole: 'admin', actionType: 'GENERATE_ACTION', resourceType: 'Action', resourceId: 'ACT-20241101-0001', details: 'Generated action draft for hostel network pattern', ipAddress: '192.168.1.10', timestamp: '2024-11-10T09:00:00' },
  { _id: 'al5', userId: { name: 'Admin User' }, userRole: 'admin', actionType: 'DATASET_UPLOAD', resourceType: 'Dataset', resourceId: 'campus_grievances_historical.csv', details: 'Uploaded and processed 1550 historical grievances', ipAddress: '192.168.1.10', timestamp: '2024-11-01T08:30:00' },
];

export const MOCK_RECURRENCE = [
  {
    patternId: 'p4',
    patternTitle: 'Water/Sanitation — Hostel (water supply, shortage)',
    patternKey: 'water-hostel-001',
    recurrenceScore: 0.78,
    semanticScore: 0.81,
    matchedCount: 23,
    totalNew: 31,
    matchRatio: 0.74,
    possibleRecurrence: true,
    evidence: 'Data shows 23 new report(s) semantically similar to the previous pattern, concentrated at Hostel. This may indicate recurrence of the underlying issue.',
    lastActionDate: '2024-10-25T00:00:00',
  },
];

export const MOCK_EVALUATION = {
  classification: { accuracy: 0.87, precision: 0.84, recall: 0.89, f1: 0.86 },
  sentiment: { precision: 0.82, recall: 0.85, f1: 0.83 },
  duplicateDetection: { precision: 0.79, recall: 0.76, f1: 0.77 },
  clustering: { silhouetteScore: 0.68, clusterStability: 'Good', humanInterpretability: 'High' },
  prediction: { mae: 3.2, rmse: 4.8, trendAccuracy: 0.81 },
  system: { avgApiLatencyMs: 142, avgAiProcessingMs: 1840, uploadProcessingMs: 12400, errorRate: 0.02 },
};
