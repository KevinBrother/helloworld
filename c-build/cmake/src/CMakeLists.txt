# src目录下的CMakeList.txt，这个CMake只是简单地把main目录和hello目录链接起来：
ADD_SUBDIRECTORY(main)
ADD_SUBDIRECTORY(tools)

ADD_EXECUTABLE(helloCMake.exe tools main)    # 告诉CMake生成一个main可执行文件， 后面两个参数是main目录和tools目录   
TARGET_LINK_LIBRARIES(helloCMake.exe tools main1)     # 链接main1和tools两个库