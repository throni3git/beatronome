module.exports = function (grunt) {
	"use strict";

	grunt.initConfig({
		ts: {
			options: {
				fast: "never",
				additionalFlags: "--lib es6,dom" // TODO: remove after grunt-ts update
			},
			app: {
				tsconfig: "src/tsconfig.json"
			}
		},

		sass: {
			options: {
				sourceMap: false,
				outputStyle: "compressed"
			},
			beatronome: {
				files: {
					"styles/beatronome.css": "sass/beatronome.scss"
				}
			}
		},

		uglify: {
			options: {
				sourceMap: false
			},
			app: {
				files: {
					"scripts/app/app.min.js": ["scripts/app/app.js"],
					"scripts/app/timingWorker.min.js": ["scripts/app/timingWorker.js"]
				}
			}
		}
	});



    var runTypescript = function(pGrunt) {
        var startTime = new Date().getTime();
        var done = pGrunt.async();
        var nodeBin = process.argv[0]; //path to node js
        grunt.util.spawn({
            cmd: nodeBin,
            args: [
                "node_modules/typescript/bin/tsc",
                "--p", pGrunt.data.tsconfig
            ],
            opts: {stdio: 'inherit'}
        }, function(pError) {
            if (pError == null) {
                var time = (new Date().getTime() - startTime) / 1000;
                var message = 'TypeScript compilation complete: ' + time.toFixed(2) + 's';
                grunt.log.writeln(message.green);
            }
            done(pError == null);
        });
    };


	grunt.loadNpmTasks("grunt-ts");
	grunt.loadNpmTasks("grunt-sass");

    grunt.task.registerMultiTask("ts", "Build typscript", function(){ runTypescript(this); });

	grunt.registerTask("default", [
		"ts:app",
		"sass:beatronome"
	]);
};
