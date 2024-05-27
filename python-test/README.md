# python-test

1. 虚拟环境

``` bash
python3 -m venv path/to/venv
source path/to/venv/bin/activate

# 修改源
pip config set global.index-url https://mirrors.aliyun.com/pypi/simple

# 安装 中配置的依赖 requirement.txt
pip install -r requirement.txt

# 安装 vc2
pip install vc2

# 安装 requirements.txt
pip install -r requirements.txt

# 退出虚拟环境
deactivate
 ```
