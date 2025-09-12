 curl -X POST http://localhost:3000/crawl \
    -H "Content-Type: application/json" \
    -d '{"urls":["https://rpa-docs.datagrand.com"], "userId":"user123", "taskId":"task456"}'

 curl -X POST http://localhost:3000/crawl \
    -H "Content-Type: application/json" \
    -d '{"urls":["http://127.0.0.1:5500/tests/html/outer.html"], "userId":"user123", "taskId":"task456"}'


 curl -X POST http://localhost:3000/crawl \
    -H "Content-Type: application/json" \
    -d '{"urls":["https://baidu.com"], "userId":"user123", "taskId":"task456"}'

 curl -X POST http://localhost:3000/crawl \
    -H "Content-Type: application/json" \
    -d '{"urls":["http://localhost:8000/#/login"], "userId":"user123", "taskId":"task456"}'


curl "http://localhost:3000/task/task456/status?userId=user123"