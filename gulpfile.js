/**
 * Starbase Gulp File
 */
var gulp = require('gulp'),
	sass = require('gulp-ruby-sass'),
	autoprefixer = require('gulp-autoprefixer'),
	minifycss = require('gulp-minify-css'),
	jshint = require('gulp-jshint'),
	uglify = require('gulp-uglify'),
	imagemin = require('gulp-imagemin'),
	rename = require('gulp-rename'),
	concat = require('gulp-concat'),
	notify = require('gulp-notify'),
	cache = require('gulp-cache'),
	livereload = require('gulp-livereload'),
	del = require('del'),
	sprite = require('css-sprite').stream,
	replace = require('gulp-replace');

/**
 * Path Settings
 */
var settings = {
	images: 'img/',
	fonts: 'fonts/',
	css: 'css/',
	js: 'js/',
	'public': 'dist/',
	'private': 'src/',
	bower: 'bower_packages/'
};

/**
 * Path Object
 */
var paths = {
	'dev': {
		'css': [
			settings.bower + 'bootstrap/dist/css/bootstrap.css',
			settings.bower + 'fontawesome/css/font-awesome.css',
			settings.bower + 'select2/select2.css',
			settings.bower + 'select2-bootstrap-css/select2-bootstrap.css',
			settings.bower + 'seiyria-bootstrap-slider/css/bootstrap-slider.css',
			settings.private + settings.css + '**/*.css',
		],
		'js': [
			settings.bower + 'jquery/dist/jquery.js',
			settings.bower + 'modernizr/modernizr.js',
			settings.bower + 'bootstrap/dist/js/bootstrap.js',
			settings.bower + 'select2/select2.js',
			settings.bower + 'seiyria-bootstrap-slider/js/bootstrap-slider.js',
			settings.bower + 'jquery-bridget/jquery.bridget.js',
			settings.private + settings.js + 'util.js',
			settings.private + settings.js + 'static.js',
			settings.private + settings.js + 'model.js',
			settings.private + settings.js + 'ui.js',
			//settings.private + settings.js + '**/*.js',
		],
		'fonts': [
			settings.bower + 'fontawesome/fonts/*',
			settings.bower + 'bootstrap/fonts/*',
			settings.private + settings.fonts + '**/*'
		],
		'img': [
			settings.bower +  'select2/select2.png',
			settings.bower +  'select2/select2x2.png',
			settings.bower +  'select2/select2-spinner.gif',
			settings.private + settings.images + '**/*',
		]
	},
	'production': {
		'fonts': settings.public + settings.fonts,
		'img': settings.public + settings.images,
		'css': settings.public + settings.css,
		'js': settings.public + settings.js,
		'js_move': settings.public + settings.js
	}
};

/**
 * Styles Task
 */
gulp.task('styles', function() {
	return gulp.src(paths.dev.css)
		.pipe(autoprefixer('last 2 version', 'safari 5', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
		.pipe(gulp.dest(paths.production.css))
		.pipe(concat('main.css'))
		.pipe(rename({suffix: '.min'}))
		.pipe(minifycss())
		.pipe(replace('url(select', 'url(../img/select')) // lol fix select2's bad layout
		.pipe(gulp.dest(paths.production.css))
		//.pipe(notify({ message: 'Styles task complete' }))
		;
});

/**
 * Scripts Task
 */
gulp.task('scripts', function() {
	return gulp.src(paths.dev.js)
		//.pipe(jshint('.jshintrc'))
		//.pipe(jshint.reporter('default'))
		.pipe(concat('main.js'))
		.pipe(gulp.dest(paths.production.js))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify())
		.pipe(gulp.dest(paths.production.js))
		//.pipe(notify({ message: 'Scripts task complete' }))
		;
});

/**
 * Images Task
 */
gulp.task('images', function() {
	return gulp.src(paths.dev.img)
		.pipe(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true }))
		.pipe(gulp.dest(paths.production.img))
		//.pipe(notify({ message: 'Images task complete' }))
		;
});

/**
 * Fonts Task
 */
gulp.task('fonts', function() {
	return gulp.src(paths.dev.fonts)
		.pipe(gulp.dest(paths.production.fonts))
		//.pipe(notify({ message: 'Fonts task complete' }))
		;
});


/**
 * Clean Task
 */
gulp.task('clean', function(cb) {
	del([paths.production.css, paths.production.js, paths.production.img, paths.production.fonts], cb)
});

/**
 * Default Task
 */
gulp.task('default', ['clean'], function() {
	gulp.start('styles', 'scripts', 'images', 'fonts');
});

/**
 * Watch Task
 */
gulp.task('watch', function() {

	// Watch .css files
	gulp.watch('src/css/**/*.css', ['styles']);

	// Watch .js files
	gulp.watch('src/js/**/*.js', ['scripts']);

	// Watch image files
	gulp.watch('src/img/**/*', ['images']);

	// Watch image files
	gulp.watch('src/fonts/**/*', ['fonts']);

	// Create LiveReload server
	livereload.listen();

	// Watch any files in dist/, reload on change
	gulp.watch(['dist/**']).on('change', livereload.changed);

});
