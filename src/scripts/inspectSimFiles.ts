import fs from 'fs';
import path from 'path';

const SIM_CARDS_DIR = 'C:\\Users\\Brare\\Desktop\\1.32a_Windows\\Builds_Windows\\OPTCGSim_Data\\StreamingAssets\\Cards';

function inspectSim() {
  if (!fs.existsSync(SIM_CARDS_DIR)) {
    console.log('SIM_CARDS_DIR does not exist!');
    return;
  }

  const getFilesRecursively = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(filePath));
      } else {
        results.push(filePath);
      }
    });
    return results;
  };

  const files = getFilesRecursively(SIM_CARDS_DIR);
  console.log('Total files in Sim:', files.length);

  const shanksFiles = files.filter(f => path.basename(f).includes('OP01-120') && !f.includes('_small'));
  console.log('\nShanks files in Sim:');
  shanksFiles.forEach(f => console.log(' -', path.basename(f)));

  const zoroFiles = files.filter(f => path.basename(f).includes('OP01-001') && !f.includes('_small'));
  console.log('\nZoro 001 files in Sim:');
  zoroFiles.forEach(f => console.log(' -', path.basename(f)));

  const luffy060Files = files.filter(f => path.basename(f).includes('OP05-060') && !f.includes('_small'));
  console.log('\nLuffy 060 files in Sim:');
  luffy060Files.forEach(f => console.log(' -', path.basename(f)));
}

inspectSim();
