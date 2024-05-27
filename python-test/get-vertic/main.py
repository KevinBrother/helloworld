import cv2
import numpy as np

# 读取图像
image = cv2.imread('./cmake.png')

# 将图像转换为灰度图
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

# 使用Canny边缘检测算法提取边缘
edges = cv2.Canny(gray, 50, 150)

# 查找轮廓
contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# 获取多边形轮廓
polygon = contours[0]

# 近似多边形轮廓
epsilon = 0.02 * cv2.arcLength(polygon, True)
approx = cv2.approxPolyDP(polygon, epsilon, True)

# 获取每个角/顶点的坐标列表
vertices = np.reshape(approx, (len(approx), 2))

# 打印每个角/顶点的坐标
for vertex in vertices:
    print(vertex)
