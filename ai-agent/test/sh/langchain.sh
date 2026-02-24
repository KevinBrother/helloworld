curl -X 'POST' \
  'http://localhost:3000/langchain/simple' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "topic": "幽默",
  "style": "professional",
  "language": "Chinese"
}'