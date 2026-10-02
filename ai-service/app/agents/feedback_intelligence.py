# Agent 2: Feedback Intelligence Agent
# Responsibilities:
#   - Generate sentence embeddings (all-MiniLM-L6-v2, 384-dim)
#   - Compute cosine similarity for duplicate/similar complaint detection
#   - Extract topic, subTopic, issueType, keywords
#   - Perform sentiment analysis (VADER + TextBlob)
#   - Calculate urgency score and duplicate probability
#   - Assign similarityGroup and clusterId
#   - Set sensitiveFlag for sensitive categories
#   - Store AI metadata alongside each grievance
