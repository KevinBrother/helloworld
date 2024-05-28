import numpy as np
import cv2 as cv

filename = r'./cmake.png'
img = cv.imread(filename)
gray = cv.cvtColor(img, cv.COLOR_BGR2GRAY)

gray = np.float32(gray)
dst = cv.cornerHarris(gray, 2, 3, 0.1)

# result is dilated for marking the corners, not important
dst = cv.dilate(dst, None)

# Threshold for an optimal value, it may vary depending on the image.
# img[dst > 0.001 * dst.max()] = [0, 0, 255]

pps = list(zip(*np.where(dst > 0.001 * dst.max())))


def kmeans(points, k, max_iters=100):
    # 随机初始化簇中心
    indices = np.random.choice(points.shape[0], k, replace=False)
    centers = points[indices]

    for _ in range(max_iters):
        # 计算每个点到簇中心的距离
        distances = np.linalg.norm(points[:, np.newaxis] - centers, axis=2)
        # 归类
        labels = np.argmin(distances, axis=1)
        # 更新簇中心
        new_centers = np.array([points[labels == i].mean(axis=0) for i in range(k)])
        # 如果簇中心不再变化，提前结束
        if np.all(centers == new_centers):
            break
        centers = new_centers

    return centers, labels

print(kmeans(np.array(pps), 6))