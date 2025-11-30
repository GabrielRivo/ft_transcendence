/// <reference path="./types/global.d.ts" preserve="true" />

export { createElement, createComponent, Fragment, FragmentComponent } from './core/component';
export { render } from './core/render';
export { useState, useEffect, useContext, createContext } from './core/hooks/index';

import './core/fiber/workLoop';

import { createElement, createComponent, Fragment, FragmentComponent } from './core/component';
import { render } from './core/render';
import { useState, useEffect, useContext, createContext } from './core/hooks/index';

export type * from './types';

const myReact = {
  createElement,
  createComponent,
  Fragment,
  FragmentComponent,
  render,
  useState,
  useEffect,
  useContext,
  createContext,
};

export default myReact;