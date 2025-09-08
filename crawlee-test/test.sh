 curl -X POST http://localhost:3000/crawl \
    -H "Content-Type: application/json" \
    -d '{"urls":["https://example.com"], "userId":"user123", "taskId":"task456"}'


curl "http://localhost:3000/task/task456/status?userId=user123"