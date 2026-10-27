import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const repository = process.env.GITHUB_REPOSITORY || 'Yashovardhan-Tripathi/Yashovardhan-Tripathi';
if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid GitHub repository name.');
let readme = await fs.readFile('README.md', 'utf8');
for (const name of ['github-stats', 'top-languages', 'contribution-activity', 'contribution-snake', 'contribution-streaks']) {
  const content = await fs.readFile(`assets/${name}.svg`);
  if (content.toString('utf8').includes('Awaiting first GitHub sync')) {
    throw new Error(`Refusing to publish a pending placeholder for ${name}.`);
  }
  const version = createHash('sha256').update(content).digest('hex').slice(0, 16);
  const url = `https://raw.githubusercontent.com/${repository}/main/assets/${name}.svg?v=${version}`;
  const pattern = new RegExp(`src="[^"]*/assets/${name}\\.svg(?:\\?[^\"]*)?"`, 'g');
  if (!pattern.test(readme)) {
    if(name!=='contribution-streaks') throw new Error(`README image missing for ${name}.`);
    const graph=/<p align="center">\s*<img src="[^"]*\/assets\/contribution-activity\.svg[^\"]*"/;
    if(!graph.test(readme)) throw new Error('Cannot locate activity graph for streak card insertion.');
    readme=readme.replace(graph, `<p align="center">\n  <img src="${url}" width="100%" alt="Yashovardhan's current and longest GitHub contribution streaks" />\n</p>\n\n$&`);
    continue;
  }
  pattern.lastIndex = 0;
  readme = readme.replace(pattern, `src="${url}"`);
}
await fs.writeFile('README.md', readme);
console.log('Updated activity images with content-based versions.');
