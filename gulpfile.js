'use strict';
// generated on 2016-01-22 using generator-ui-component 0.0.8
var gulp            = require('gulp');
var $               = require('gulp-load-plugins')();
var browserSync     = require('browser-sync');
var reload          = browserSync.reload;
var autoprefixer    = require('autoprefixer');
var browserify      = require('browserify');
var babelify        = require('babelify');
var source          = require('vinyl-source-stream');
var buffer          = require('vinyl-buffer');
var del             = require('del');
var rev             = new (require('gulp-rev-all'))();

gulp.task('styles:clean', function(done) {
    del(['dist/*.css']).then(() => done());
});

gulp.task('styles:build', function() {
    return gulp.src('src/styles/*.scss')
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            outputStyle: 'nested',
            includePaths: ['.'],
            onError: console.error.bind(console, 'Sass error:')
        }))
        .pipe($.postcss([
            autoprefixer({
                browsers: ['last 10 versions','ie 8']
            })
        ]))
        .pipe($.sourcemaps.write())
        .pipe($.size({
            title: 'styles'
        }))
        .pipe(gulp.dest('build'))
        .pipe(reload({
            stream: true
        }));
});

gulp.task('styles:dist', ['styles:clean', 'styles:build'], function() {
    return gulp.src('build/*.css')
        .pipe($.csso())
        .pipe($.rename({
            suffix: ".min"
        }))
        .pipe($.size({
            title: 'styles:dist'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('js:lint', function () {
    return gulp.src(['src/**/*.js'])
        .pipe($.eslint())
        .pipe($.eslint.format())
        .pipe($.eslint.failOnError());
});

gulp.task('js:clean', function(done) {
    del(['dist/*.js']).then(() => done());
});

gulp.task('js:build', function () {
    return browserify({entries: './src/scripts/main.js', debug: true})
        .transform('babelify')
        .bundle()
        .pipe(source('main.js'))
        .pipe(gulp.dest('./build'));
});

gulp.task('js:dist', ['js:clean', 'js:build'], function() {
    return gulp.src(['build/*.js'])
        .pipe($.uglify())
        .pipe($.rename({
            suffix: ".min"
        }))
        .pipe($.size({
            title: 'scripts:dist'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('html:dist', function() {
    var manifest = require('./dist/rev-manifest.json');

    return gulp.src(['index.html'])
        .pipe($.replace('build/main__large.css', manifest['main__large.min.css']))
        .pipe($.replace('build/main.js', manifest['main.min.js']))
        .pipe(gulp.dest('dist'));
});

gulp.task('rev', function() {
    return gulp.src(['dist/**/*.css', 'dist/**/*.js'])
        .pipe(rev.revision())
        .pipe(gulp.dest('./dist'))
        .pipe(rev.manifestFile())
        .pipe(gulp.dest('./dist'));
});

gulp.task('serve', ['default'], function() {
    browserSync({
        notify: false,
        port: 9000,
        server: {
            baseDir: ['.']
        }
    });

    gulp.watch([
        '*.html',
        'src/**/*.js'
    ]).on('change', reload);

    gulp.watch('src/styles/**/*.scss', ['styles:build']);
    gulp.watch('src/scripts/**/*.js', ['js:build']);
});

gulp.task('build', ['styles:build', 'js:build'], function() {
    gulp.start('dist');
});

gulp.task('dist', function(done) {
    $.runSequence(['styles:dist', 'js:dist'], 'rev', 'html:dist', done);
});

gulp.task('deploy', ['dist'], function () {
    return gulp.src('./dist/**/*')
        .pipe($.ghPages({
            force: true
    }));
});

gulp.task('default', ['serve'], function() {
    return gulp.src('dist/**/*').pipe($.size({
        title: 'default'
    }));
});
