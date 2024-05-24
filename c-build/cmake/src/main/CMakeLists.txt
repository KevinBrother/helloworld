FILE(GLOB SOURCE_1 "${PROJECT_ROOT_PATH}/src/*.cpp")      #告诉CMake源文件在哪里？
ADD_LIBRARY(main1 STATIC ${SOURCE_1})                                           #告诉CMake静态库在哪里？