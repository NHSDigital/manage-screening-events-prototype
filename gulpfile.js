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
    .pipe(sass())
    .pipe(gulp.dest('public/css'))
    .on('error', (err) => {
      console.log(err);
      process.exit(1);
    });
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
      '!**/assets/**/**/*.js', // Don't copy JS files
      '!**/assets/**/**/*.scss', // Don't copy SCSS files
    ], { encoding: false })
    .pipe(gulp.dest('public'));
}

// Start nodemon with enhanced watching
function startNodemon(done) {
  const server = nodemon({
    script: 'app.js',
    stdout: true,
    ext: 'js json', // Added json to watch for package.json changes
    watch: [
      'app/**/*.js',    // Watch all JS files in app directory
      'app.js',         // Watch main app file
      'routes/**/*.js', // Watch route files
      'lib/**/*.js',    // Watch library files
      'config/**/*.js'  // Watch configuration files
    ],
    ignore: [
      'app/assets/**',  // Ignore asset files
      'public/**',      // Ignore compiled files
      'node_modules/**' // Ignore node_modules
    ],
    delay: 1000,        // Add a small delay to prevent rapid restarts
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

  // Add restart event handler
  server.on('restart', () => {
    console.log('Restarting server due to changes...');
  });
}

function reload() {
  browserSync.reload();
}

// Start browsersync with enhanced configuration
function startBrowserSync(done) {
  browserSync.init(
    {
      proxy: 'localhost:' + port,
      port: port + 1000,
      ui: false,
      files: [
        'app/views/**/*.*',
        'docs/views/**/*.*',
        'public/**/*.*'
      ],
      ghostMode: false,
      open: false,
      notify: true,
      watch: true,
      reloadDelay: 1000, // Add delay before reload
      reloadDebounce: 1000 // Debounce reloads
    },
    done
  );
  gulp.watch('public/**/*.*').on('change', reload);
}

// Enhanced watch function
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

gulp.task(
  'build',
  gulp.series(cleanPublic, compileStyles, compileScripts, compileAssets)
);
gulp.task('default', gulp.series(startNodemon, startBrowserSync, watch));
