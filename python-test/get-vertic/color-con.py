colors = [    
    [106, 104, 224],
    [247, 92, 86],
    [36, 145, 21],
    [0, 0, 0],
]

normalized_colors = []

def get_color():
    for color in colors:
        normalized_color = []
        for i in color:
            normalized_color.append(round(i / 255, 1))
        normalized_colors.append(normalized_color)

get_color()


print(normalized_colors)