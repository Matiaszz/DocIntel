const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const entryFile = path.join(rootDir, 'openapi', 'openapi.yml');
const destRootFile = path.join(rootDir, 'openapi.yml');
const destStaticFile = path.join(rootDir, 'src', 'main', 'resources', 'static', 'openapi.yml');

console.log('Bundling OpenAPI/Swagger documentation...');

try {
  // Execute Redocly CLI via npx to bundle files
  execSync(`npx @redocly/cli bundle "${entryFile}" -o "${destRootFile}"`, {
    stdio: 'inherit',
    cwd: rootDir
  });

  // Check if root openapi.yml exists before copying
  if (fs.existsSync(destRootFile)) {
    // Ensure destination directory for static resources exists
    const staticDir = path.dirname(destStaticFile);
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir, { recursive: true });
    }

    // Copy to Spring Boot static resources
    fs.copyFileSync(destRootFile, destStaticFile);
    console.log(`\nSuccess!`);
    console.log(`- Bundled file: ${destRootFile}`);
    console.log(`- Copied to:    ${destStaticFile}`);
  } else {
    throw new Error('Bundled openapi.yml file was not created.');
  }
} catch (error) {
  console.error('\nError bundling OpenAPI/Swagger documentation:');
  console.error(error.message);
  process.exit(1);
}
