FILE(GLOB SOURCE_1 "${PROJECT_ROOT_PATH}/src/*.cpp")      #告诉CMake源文件在哪里？

# EXECUTE_PROCESS(
#     COMMAND ${CMAKE_COMMAND} -E copy ${PROJECT_ROOT_PATH}/README.md ${EXECUTABLE_OUTPUT_PATH}/README.md
# )

# 将静态资源复制到构建目录
ADD_CUSTOM_TARGET( CopyResources 
    COMMAND ${CMAKE_COMMAND} -E copy ${PROJECT_ROOT_PATH}/README.md ${EXECUTABLE_OUTPUT_PATH}/README.md
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${PROJECT_ROOT_PATH}/src/resources ${EXECUTABLE_OUTPUT_PATH}/resources
)

ADD_EXECUTABLE(helloCMake ${SOURCE_1})                                          #告诉CMake生成一个main可执行文件

#自定义目标作为依赖项添加进去
ADD_DEPENDENCIES(helloCMake CopyResources)

TARGET_LINK_LIBRARIES(helloCMake tools)                                              #告诉CMake静态库在哪里？


ADD_LIBRARY(main1 STATIC ${SOURCE_1})                                           #告诉CMake静态库在哪里？
