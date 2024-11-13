// Core dependencies
const gulp = require('gulp');

// External dependencies
const babel = require('gulp-babel');
const browserSync = require('browser-sync');
const clean = require('gulp-clean');
const sass = require('gulp-sass')(require('sass'));
const nodemon = require('gulp-nodemon');

// Local dependencies
const config = require('./app/config');

// Set configuration variables
const port = parseInt(process.env.PORT) || config.port;

// Delete all the files in /public build directory
function cleanPublic() {
  return gulp.src('public', { allowEmpty: true }).pipe(clean());
}

sass.compiler = require('sass');

// Compile SASS to CSS
function compileStyles() {
  return gulp
    .src(['app/assets/sass/**/*.scss', 'docs/assets/sass/**/*.scss'])
    .pipe(sass({
      outputStyle: 'expanded',
      sourceComments: true
    }).on('error', sass.logError))
    .pipe(gulp.dest('public/css'));
}

// Compile JavaScript (with ES6 support)
function compileScripts() {
  return gulp
    .src(['app/assets/javascript/**/*.js'])
    .pipe(babel())
    .pipe(gulp.dest('public/js'));
}

// Compile assets
function compileAssets() {
  return gulp
    .src([
      'app/assets/**/**/*.*',
      'docs/assets/**/**/*.*',
      '!**/assets/**/**/*.js',
      '!**/assets/**/**/*.scss',
    ], { encoding: false })
    .pipe(gulp.dest('public'));
}

// Start nodemon
function startNodemon(done) {
  const server = nodemon({
    script: 'app.js',
    stdout: true,
    ext: 'js json',
    watch: [
      'app/**/*.js',
      'app.js',
      'routes/**/*.js',
      'lib/**/*.js',
      'config/**/*.js'
    ],
    ignore: [
      'app/assets/**',
      'public/**',
      'node_modules/**'
    ],
    delay: 1000,
    quiet: false,
  });

  let starting = false;

  const onReady = () => {
    starting = false;
    done();
  };

  server.on('start', () => {
    starting = true;
    setTimeout(onReady);
  });

  server.on('stdout', (stdout) => {
    process.stdout.write(stdout);
    if (starting) {
      onReady();
    }
  });

  server.on('restart', () => {
    console.log('Restarting server due to changes...');
  });
}

function reload() {
  browserSync.reload();
}

// Start browsersync
function startBrowserSync(done) {
  browserSync.init({
    proxy: 'localhost:' + port,
    port: port + 1000,
    ui: false,
    files: [
      'public/css/**/*.css',
      'public/js/**/*.js',
      'app/views/**/*'
    ],
    ghostMode: false,
    open: false,
    notify: false,
    logFileChanges: false,
    reloadDebounce: 1000
  }, done);
}

// Watch files
function watch() {
  gulp.watch('app/assets/sass/**/*.scss', gulp.series(compileStyles, reload));
  gulp.watch('app/assets/javascript/**/*.js', gulp.series(compileScripts, reload));
  gulp.watch('app/assets/**/**/*.*', gulp.series(compileAssets, reload));
  gulp.watch('docs/assets/sass/**/*.scss', gulp.series(compileStyles, reload));
  gulp.watch('docs/assets/javascript/**/*.js', gulp.series(compileScripts, reload));
  gulp.watch('docs/assets/**/**/*.*', gulp.series(compileAssets, reload));
}

exports.watch = watch;
exports.compileStyles = compileStyles;
exports.compileScripts = compileScripts;
exports.cleanPublic = cleanPublic;

gulp.task('build',
  gulp.series(cleanPublic, compileStyles, compileScripts, compileAssets)
);

gulp.task('default', gulp.series(startNodemon, startBrowserSync, watch));
