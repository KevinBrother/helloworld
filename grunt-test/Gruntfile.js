module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    requirejs: {
      compile: {
        options: {
          baseUrl: './',
          // mainConfigFile: 'path/to/config.js',
          name: './src/js/entry.js' /* assumes a production build using almond, if you don't use almond, you
                                 need to set the "includes" or "modules" option instead of name */,
          // include: ['src/main.js'],
          out: 'dist/js/entry.min.js'
        }
      }
    },
    babel: {
      options: {
        sourceMap: true,
        presets: ['@babel/preset-env']
      },
      dist: {
        files: {
          'dist/app.js': 'src/app.js'
        }
      }
    },
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['src/js/*.js'],
        dest: 'dist/js/build.js'
      }
    },
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner:
          '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'dist/js/build.js',
        dest: 'dist/js/build.min.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // 默认被执行的任务列表。
  grunt.registerTask('default', ['concat', 'uglify']);
  grunt.registerTask('require', ['requirejs']);
};
