# 系统代理

## [x] 获取代理

## [x] 增加代理

## 使用代理

## 删除代理

## 其他

- curl

  - 默认不会走系统代理

    ``` bash
    curl http://example.com
    ```

  - 如果需要走系统代理需要配置 -x

    ``` bash
    # 假设代理的 host 是 localhost，端口为 7890 的本地服务器代理
    curl -x localhost:7890  http://example.com
    ```
