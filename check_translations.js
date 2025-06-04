const fs = require('fs');
const path = require('path');

// 读取中英文基准文件
const zhData = JSON.parse(fs.readFileSync('i18n/pages/landing/zh.json', 'utf8'));
const enData = JSON.parse(fs.readFileSync('i18n/pages/landing/en.json', 'utf8'));

// 提取所有key的递归函数
function extractKeys(obj, prefix = '') {
  let keys = [];
  for (let key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(fullKey);
      keys = keys.concat(extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// 获取所有基准key
const zhKeys = new Set(extractKeys(zhData));
const enKeys = new Set(extractKeys(enData));
const baseKeys = new Set([...zhKeys, ...enKeys]);

console.log('基准keys总数:', baseKeys.size);
console.log('中文keys:', zhKeys.size);
console.log('英文keys:', enKeys.size);

// 检查中英文差异
const zhMissing = [...enKeys].filter(key => !zhKeys.has(key));
const enMissing = [...zhKeys].filter(key => !enKeys.has(key));

if (zhMissing.length > 0) {
  console.log('\n中文缺失的keys (相比英文):', zhMissing);
}
if (enMissing.length > 0) {
  console.log('\n英文缺失的keys (相比中文):', enMissing);
}

// 检查所有语言文件
const languageFiles = ['es.json', 'fr.json', 'de.json', 'ja.json', 'ko.json', 'ar.json', 'zh-tw.json'];
const missingReport = {};

languageFiles.forEach(file => {
  const langCode = file.replace('.json', '');
  try {
    const langData = JSON.parse(fs.readFileSync(`i18n/pages/landing/${file}`, 'utf8'));
    const langKeys = new Set(extractKeys(langData));
    
    const missing = [...baseKeys].filter(key => !langKeys.has(key));
    const extra = [...langKeys].filter(key => !baseKeys.has(key));
    
    missingReport[langCode] = {
      missing: missing,
      extra: extra,
      total: langKeys.size
    };
    
    console.log(`\n${langCode.toUpperCase()} (${langKeys.size} keys):`);
    if (missing.length > 0) {
      console.log('  缺失的keys:', missing.slice(0, 10));
      if (missing.length > 10) console.log(`  ...还有${missing.length - 10}个缺失的keys`);
    }
    if (extra.length > 0) {
      console.log('  多余的keys:', extra.slice(0, 5));
    }
    if (missing.length === 0 && extra.length === 0) {
      console.log('  ✅ 完全对齐');
    }
  } catch (e) {
    console.log(`${langCode}: 读取错误 - ${e.message}`);
  }
});

// 输出详细的缺失报告
console.log('\n\n=== 详细缺失报告 ===');
Object.entries(missingReport).forEach(([lang, report]) => {
  if (report.missing.length > 0) {
    console.log(`\n${lang.toUpperCase()} 缺失的完整列表:`);
    report.missing.forEach(key => console.log(`  - ${key}`));
  }
}); 