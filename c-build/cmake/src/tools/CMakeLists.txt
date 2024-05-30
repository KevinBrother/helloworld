FILE(GLOB tools ${PROJECT_ROOT_PATH}/src/tools/*.cpp)      #告诉CMake源文件在哪里？
ADD_LIBRARY(tools STATIC ${tools})                       #告诉CMake生成的是一个静态库