FILE(GLOB SOURCE_1 "${PROJECT_ROOT_PATH}/src/*.cpp")      #告诉CMake源文件在哪里？
ADD_EXECUTABLE(helloCMake ${SOURCE_1})                                          #告诉CMake生成一个main可执行文件
TARGET_LINK_LIBRARIES(helloCMake tools)                                              #告诉CMake静态库在哪里？