import './styles/base.css';
import './styles/hero.css';
import './styles/card.css';
import { projects } from './projects.js';
import { renderCard } from './card.js';

const grid = document.querySelector('#grid');
projects.forEach((project, index) => grid.append(renderCard(project, index)));

document.querySelector('#count').textContent = projects.length;
