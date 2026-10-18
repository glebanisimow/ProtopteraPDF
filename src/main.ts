import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

// The context menu offers browser actions (reload, inspect) that make no sense in a reader.
if (!import.meta.env.DEV) window.addEventListener('contextmenu', (e) => e.preventDefault());

mount(App, { target: document.getElementById('app')! });
