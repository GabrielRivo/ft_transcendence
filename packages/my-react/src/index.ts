/// <reference path="./types/global.d.ts" preserve="true" />

export { createElement, createComponent, Fragment, FragmentComponent } from './core/component';
export { render } from './core/render';
export { useState, useEffect, useContext, createContext, useRef, useCallback, useMemo } from './core/hooks/index';
export { createPortal } from './core/portal';


import './core/fiber/workLoop';

import { createElement, createComponent, Fragment, FragmentComponent } from './core/component';
import { render } from './core/render';
import { useState, useEffect, useContext, createContext, useRef, useCallback, useMemo } from './core/hooks/index';
import { createPortal } from './core/portal';


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
  useRef,
  useCallback,
  useMemo,
  createPortal,
};


export default myReact;