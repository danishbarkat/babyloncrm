import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export function loadWorkflowConfig() {
    // Try monorepo root first (Vercel serverless cwd), then local dev cwd fallback.
    const candidates = [
        {
            schema: path.resolve(process.cwd(), 'packages/workflows/workflow-pack.schema.json'),
            config: path.resolve(process.cwd(), 'packages/workflows/workflow-pack.v1.json'),
        },
        {
            schema: path.resolve(process.cwd(), '../../packages/workflows/workflow-pack.schema.json'),
            config: path.resolve(process.cwd(), '../../packages/workflows/workflow-pack.v1.json'),
        },
    ];

    const found = candidates.find(p => fs.existsSync(p.schema) && fs.existsSync(p.config));

    if (!found) {
        console.error('Missing workflow configuration files in expected locations:');
        candidates.forEach(p => console.error(`Schema: ${p.schema}\nConfig: ${p.config}`));
        process.exit(1);
    }

    const { schema: schemaPath, config: configPath } = found;

    const schemaJson = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const configJson = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    const validate = ajv.compile(schemaJson);
    const isValid = validate(configJson);

    if (!isValid) {
        console.error('Workflow configuration validation failed:');
        validate.errors?.forEach(err => {
            console.error(`- ${err.instancePath} ${err.message}`, err.params);
        });
        process.exit(1);
    }

    console.log('Workflow configuration validated successfully.');
    return configJson;
}
