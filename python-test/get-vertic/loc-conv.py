def convert_to_cartesian(x, y, screen_height):
    half_width = screen_height / 2
    x2 = (x - half_width) / half_width
    y2 = (half_width - y) / half_width
    return round(x2, 3), round(y2, 3)

# 示例使用
screen_height = 480  # 假设屏幕高度为480像素
x1 = 100  # 左上角坐标系中的 x 值
y1 = 200  # 左上角坐标系中的 y 值

x2, y2 = convert_to_cartesian(x1, y1, screen_height)
print(f"笛卡尔坐标系中的坐标为 ({x2}, {y2})")