import threading
import time

class SharedObject:
    def __init__(self):
        self.lock = threading.Lock()
        self.flag = False

    def read_flag(self):
        with self.lock:
            return self.flag

    def write_flag(self, value):
        with self.lock:
            self.flag = value

def worker_read(shared_obj):
    count_true = 0
    count_false = 0
    for _ in range(5):
        time.sleep(0.5)
        flag = shared_obj.read_flag()
        if flag:
            count_true += 1
        else:
            count_false += 1
    print("Count true: {}, count false: {}".format(count_true, count_false))

def worker_write(shared_obj):
    for _ in range(3):
        time.sleep(1)
        shared_obj.write_flag(True)
        time.sleep(1)
        shared_obj.write_flag(False)

shared_obj = SharedObject()

# 创建多个读取线程和一个写入线程
read_threads = [threading.Thread(target=worker_read, args=(shared_obj,)) for _ in range(3)]
write_thread = threading.Thread(target=worker_write, args=(shared_obj,))

# 启动线程
for thread in read_threads:
    thread.start()
write_thread.start()

# 等待线程完成
for thread in read_threads:
    thread.join()
write_thread.join()