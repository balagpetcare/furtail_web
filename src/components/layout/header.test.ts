import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuLabel, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '../ui/dropdown-menu';

test('DropdownMenuLabel renders successfully within DropdownMenuGroup', () => {
  const html = renderToStaticMarkup(
    React.createElement(DropdownMenuGroup, {},
      React.createElement(DropdownMenuLabel, {}, "Test User")
    )
  );
  assert.match(html, /Test User/);
});

test('DropdownMenuLabel throws an error when rendered outside DropdownMenuGroup', () => {
  assert.throws(() => {
    renderToStaticMarkup(
      React.createElement(DropdownMenuLabel, {}, "Test User")
    );
  }, /MenuGroupContext/);
});

test('Header source code defines correct menu composition and items', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/layout/header.tsx'), 'utf8');

  // Verify DropdownMenu components are imported
  assert.match(source, /DropdownMenu/);
  assert.match(source, /DropdownMenuGroup/);
  assert.match(source, /DropdownMenuLabel/);

  // Verify menu layout contains Profile, Settings, and Log out
  assert.match(source, /My Profile/);
  assert.match(source, /Settings/);
  assert.match(source, /Log out/);

  // Verify DropdownMenuLabel is wrapped inside DropdownMenuGroup
  assert.match(source, /<DropdownMenuGroup>\s*<DropdownMenuLabel/);
});
