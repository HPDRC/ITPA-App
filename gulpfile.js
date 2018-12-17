/// <binding BeforeBuild='default' />
var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var uglify = require('gulp-uglify');
var nganotate = require('gulp-ng-annotate');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var del = require('del');

var paths = {
    scripts: [
        'www/js/js/itpacore.js',
        'www/js/js/featurelayers.js',
        'www/js/js/mapetatoaster.js',
        'www/js/js/mapfeaturetoaster.js',
        'www/js/js/eta.js',
        'www/js/app.js',
        'www/js/controllers/*.js',
        'www/js/services/*.js'],
    sass: ['./scss/**/*.scss', './www/sass/**/*']
};

gulp.task("combine-and-ug`fy", function () {
    return gulp.src(paths.scripts)
        .pipe(nganotate())
        .pipe(concat('combined.js'))
        .pipe(uglify({ mangle: true, fromString: true }))
        .pipe(gulp.dest('www/min'));
});

gulp.task("del-ios-non-mini", function () {
    del(['platforms/ios/www/js']);
});

gulp.task('default', ['sass']);

gulp.task('sass', function(done) {
    //gulp.src('./scss/ionic.app.scss')
    gulp.src('./scss/*.scss')
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('watch', function () {
    gulp.watch(paths.sass, ['sass']);
});

gulp.task('install', ['git-check'], function () {
    return bower.commands.install()
      .on('log', function (data) {
          gutil.log('bower', gutil.colors.cyan(data.id), data.message);
      });
});

gulp.task('git-check', function (done) {
    if (!sh.which('git')) {
        console.log(
          '  ' + gutil.colors.red('Git is not installed.'),
          '\n  Git, the version control system, is required to download Ionic.',
          '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
          '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
        );
        process.exit(1);
    }
    done();
});
