import cv2
import numpy as np

def convert_to_cartesian(x, y, screen_height):
    half_width = screen_height / 2
    x2 = (x - half_width) / half_width
    y2 = (half_width - y) / half_width
    return round(x2, 3), round(y2, 3)

# 读取图像
image = cv2.imread('./cmake.png')
hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

# 颜色范围定义 (你可能需要根据图像调整这些范围)
color_ranges = {
    'blue': ((100, 150, 50), (140, 255, 255)),
    'green': ((40, 50, 50), (80, 255, 255)),
    'red': ((0, 50, 50), (10, 255, 255)),
    'gray': ((0, 0, 200), (180, 25, 255))
}

triangles = {}

# 查找各颜色的三角形
for color, (lower, upper) in color_ranges.items():
    mask = cv2.inRange(hsv, lower, upper)
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    for contour in contours:
        epsilon = 0.04 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        if len(approx) == 3:
            if color not in triangles:
                triangles[color] = []
            triangles[color].append(approx)

# 输出每个三角形的顶点数据
for color, tris in triangles.items():
    print(f"{color.capitalize()} Triangles:")
    for i, tri in enumerate(tris):
        print(f"  Triangle {i+1} vertices:")
        for vertex in tri:
            print(f"{convert_to_cartesian(vertex[0][0], vertex[0][1], image.shape[0])}")

# 可视化检测到的三角形
for color, tris in triangles.items():
    for tri in tris:
        cv2.drawContours(image, [tri], -1, (0, 255, 0), 2)

# 显示结果图像
cv2.imshow('Detected Triangles', image)
cv2.waitKey(0)
cv2.destroyAllWindows()
