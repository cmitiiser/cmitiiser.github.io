const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// Get the input file path from the command line arguments
const inputFile = process.argv[2];

if (!inputFile) {
  console.error('ERROR: Please provide an input file path.');
  console.log('Usage: node assets/scripts/minify.js <path-to-file.js>');
  process.exit(1);
}

async function minifyFile() {
  try {
    // 1. Resolve paths and check if the file exists
    const absoluteInputPath = path.resolve(inputFile);
    if (!fs.existsSync(absoluteInputPath)) {
      console.error(`ERROR: File not found: ${absoluteInputPath}`);
      process.exit(1);
    }

    // 2. Generate the output file name (.js -> .min.js)
    const parsedPath = path.parse(absoluteInputPath);
    const outputFileName = `${parsedPath.name}.min.js`;
    const absoluteOutputPath = path.join(parsedPath.dir, outputFileName);

    // 3. Read the original source code
    console.log(`Reading ${parsedPath.base}...`);
    const code = fs.readFileSync(absoluteInputPath, 'utf8');

    // 4. Configure and run Terser minification
    console.log('Minifying...');
    const options = {
      compress: {
        dead_code: true,
        drop_debugger: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        hoist_funs: true,
        keep_fargs: false,
        join_vars: true
      },
      mangle: {
        toplevel: true
      }
    };

    const result = await minify(code, options);

    if (result.error) {
      throw result.error;
    }

    // 5. Write the minified code to the new file
    fs.writeFileSync(absoluteOutputPath, result.code, 'utf8');
    console.log(`Success! Minified file saved to: ${absoluteOutputPath}`);

  } catch (error) {
    console.error('ERROR: Minification failed:', error);
  }
}

minifyFile();