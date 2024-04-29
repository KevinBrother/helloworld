import threading

class SharedObject:
    def __init__(self):
        self.lock = threading.Lock()
        self.bool_property = False
    
    def write_property(self, value):
        with self.lock:
            self.bool_property = value

    def read_property(self):
        with self.lock:
            return self.bool_property

def write_operation(shared_obj):
    real_true_count = 0
    for _ in range(1000000):  # 大量迭代以增加并发机会
        shared_obj.write_property(not shared_obj.read_property())  # 切换布尔属性值
        if shared_obj.read_property():
            real_true_count += 1
    print(f"Real True count: {real_true_count}")

def read_operation(shared_obj):
    count_true = 0
    count_false = 0
    for _ in range(1000000):  # 大量迭代以增加并发机会
        if shared_obj.read_property():
            count_true += 1
        else:
            count_false += 1
    print(f"True count: {count_true}, False count: {count_false}")

# 创建共享对象
shared_obj = SharedObject()

# 创建一个写入线程和多个读取线程
write_thread = threading.Thread(target=write_operation, args=(shared_obj,))
read_thread1 = threading.Thread(target=read_operation, args=(shared_obj,))
read_thread2 = threading.Thread(target=read_operation, args=(shared_obj,))

# 启动线程
write_thread.start()
read_thread1.start()
read_thread2.start()
