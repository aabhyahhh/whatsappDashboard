import fs from 'fs';
import path from 'path';

// Check all model files for the correct mongoose model pattern
function checkModelPatterns() {
  console.log('🔍 Checking Mongoose Model Patterns');
  console.log('===================================');
  
  const modelsDir = path.join(process.cwd(), 'server', 'models');
  const files = fs.readdirSync(modelsDir);
  
  const modelFiles = files.filter(file => file.endsWith('.js') || file.endsWith('.ts'));
  
  console.log(`📁 Found ${modelFiles.length} model files in ${modelsDir}`);
  
  let issuesFound = 0;
  
  for (const file of modelFiles) {
    const filePath = path.join(modelsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for the old pattern: mongoose.model('Name', schema)
    const oldPattern = /mongoose\.model\(['"`][^'"`]+['"`],\s*\w+\)/g;
    const oldMatches = content.match(oldPattern);
    
    // Check for the new pattern: mongoose.models.Name || mongoose.model('Name', schema)
    const newPattern = /mongoose\.models\.\w+\s*\|\|\s*mongoose\.model\(['"`][^'"`]+['"`],\s*\w+\)/g;
    const newMatches = content.match(newPattern);
    
    // Check for TypeScript pattern with type assertion: (mongoose.models.Name || mongoose.model('Name', schema)) as mongoose.Model<Type>
    const tsPattern = /\(mongoose\.models\.\w+\s*\|\|\s*mongoose\.model\(['"`][^'"`]+['"`],\s*\w+\)\)\s*as\s*mongoose\.Model/;
    const tsMatches = content.match(tsPattern);
    
    if (oldMatches && oldMatches.length > 0 && (!newMatches || newMatches.length === 0) && (!tsMatches || tsMatches.length === 0)) {
      console.log(`❌ ${file}: Uses old pattern (${oldMatches.length} instances)`);
      console.log(`   Old pattern found: ${oldMatches.join(', ')}`);
      issuesFound++;
    } else if (newMatches && newMatches.length > 0) {
      console.log(`✅ ${file}: Uses correct pattern (${newMatches.length} instances)`);
    } else if (tsMatches && tsMatches.length > 0) {
      console.log(`✅ ${file}: Uses correct TypeScript pattern (${tsMatches.length} instances)`);
    } else if (content.includes('mongoose.model')) {
      console.log(`⚠️  ${file}: Contains mongoose.model but pattern unclear`);
    } else {
      console.log(`ℹ️  ${file}: No mongoose.model usage (schema only)`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total files: ${modelFiles.length}`);
  console.log(`   Issues found: ${issuesFound}`);
  
  if (issuesFound === 0) {
    console.log('✅ All model files use the correct pattern!');
  } else {
    console.log('❌ Some files need to be updated to use the correct pattern.');
    console.log('   Pattern: mongoose.models.ModelName || mongoose.model("ModelName", schema)');
  }
}

// Run the check
checkModelPatterns();
