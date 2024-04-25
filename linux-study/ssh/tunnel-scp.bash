# 目标：把本机的 a.bash 文件上传到目标机器的 /nas/product/deploy_homepage目录下
## 建立SSH隧道连接，将本机的7788端口映射到目标机器的22端口，再使用scp命令上传文件到目标机器的指定目录下

# 思路
## 本机用户为 端口为7788
## 跳板机用户为 caojunjie 端口为 58422，ip/域名为 jumper-huabei2-vpc.datagrand.com
## 目标机器用户为 duser 端口为 22 ip/域名为 172.17.19.218

# 本机会打开shell，并进入到 shell中
ssh -L 7788:172.17.19.218:22 caojunjie@jumper-huabei2-vpc.datagrand.com  -p 58422

# -f:后台运行。 -N:禁止远程命令执行。 -p:指定端口。
# 通常，与-f选项一起使用的是-N选项，以便只建立SSH隧道连接而不执行远程命令，并将SSH会话放到后台运行
ssh -f -p 58422 caojunjie@jumper-huabei2-vpc.datagrand.com -L 7788:172.17.19.218:22  -N

# 把本机的 a.bash 文件上传到目标机器的 /nas/product/deploy_homepage目录下
scp -P 7788 ./a.bash duser@127.0.0.1:/nas/product/deploy_homepage

# 把目标机器的 /nas/product/deploy_homepage目录下的文件下载到本机的当前目录下
scp -P 7788 duser@127.0.0.1:/nas/product/deploy_homepage/b.bash ./


# 关闭隧道
## 找到进程号，kill 进程号
ps -ef | grep ssh
kill 进程号

# 参考链接：https://www.lixueduan.com/posts/linux/07-ssh-tunnel/