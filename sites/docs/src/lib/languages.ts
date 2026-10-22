import type * as Types from './languages.types'
import {
	c,
	csharp,
	cpp,
	clojure,
	css,
	dart,
	diff,
	dockerfile,
	dotenv,
	elixir,
	glsl,
	go,
	graphql,
	groovy,
	hcl,
	html,
	ini,
	java,
	javascript,
	json,
	jsonc,
	jsx,
	julia,
	kotlin,
	lua,
	makefile,
	markdown,
	nginx,
	php,
	plaintext,
	powershell,
	protobuf,
	python,
	r,
	ruby,
	rust,
	scala,
	shell,
	sql,
	svelte,
	swift,
	toml,
	tsx,
	typescript,
	vue,
	xml,
	yaml,
	zig,
} from '@vortexlabs/kirari/languages'

export const languageEntries: readonly Types.LanguageEntry[] = [
	{
		id: 'c',
		label: 'C',
		group: 'Programming',
		language: c,
		filename: 'hello.c',
		sample: `#include <stdio.h>

int main(void) {
  const char *message = "Hello from Kirari";
  puts(message);
  return 0;
}`,
	},
	{
		id: 'csharp',
		label: 'C#',
		group: 'Programming',
		language: csharp,
		filename: 'Greeting.cs',
		sample: `using System;

record Greeting(string Name) {
  public string Message => $"Hello, {Name}!";
}

class Program {
  static void Main() => Console.WriteLine(new Greeting("Kirari").Message);
}`,
	},
	{
		id: 'cpp',
		label: 'C++',
		group: 'Programming',
		language: cpp,
		filename: 'hello.cpp',
		sample: `#include <iostream>
#include <string>

int main() {
  const std::string name = "Kirari";
  std::cout << "Hello, " << name << "!" << std::endl;
}`,
	},
	{
		id: 'clojure',
		label: 'Clojure',
		group: 'Programming',
		language: clojure,
		filename: 'greetings.clj',
		sample: `(ns greetings.core)

(def names ["Ada" "Lin" "Sam"])
(defn greet [name]
  (str "Hello, " name "!"))

(doseq [name names]
  (println (greet name)))`,
	},
	{
		id: 'css',
		label: 'CSS',
		group: 'Web',
		language: css,
		filename: 'card.css',
		sample: `.card {
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
  color: #f4f4f5;
  background: #18181b;
  border-radius: 0.75rem;
}`,
	},
	{
		id: 'dart',
		label: 'Dart',
		group: 'Programming',
		language: dart,
		filename: 'greetings.dart',
		sample: `void main() {
  final names = <String>['Ada', 'Lin', 'Sam'];

  for (final name in names) {
    print('Hello, $name!');
  }
}`,
	},
	{
		id: 'diff',
		label: 'Diff',
		group: 'Data',
		language: diff,
		filename: 'greeting.diff',
		sample: `--- a/greeting.js
+++ b/greeting.js
@@ -1,2 +1,3 @@
-const name = 'world'
+const name = 'Kirari'
+// Give the reader a warm welcome.
 console.log(\`Hello, \${name}!\`)`,
	},
	{
		id: 'dockerfile',
		label: 'Dockerfile',
		group: 'Configuration',
		language: dockerfile,
		filename: 'Dockerfile',
		sample: `FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["bun", "run", "start"]`,
	},
	{
		id: 'dotenv',
		label: 'Dotenv',
		group: 'Configuration',
		language: dotenv,
		filename: '.env.example',
		sample: `# Local development settings
APP_NAME="Kirari playground"
PORT=3000
LOG_LEVEL=debug
PUBLIC_URL=http://localhost:3000
ENABLE_PREVIEW=true`,
	},
	{
		id: 'elixir',
		label: 'Elixir',
		group: 'Programming',
		language: elixir,
		filename: 'greetings.exs',
		sample: `defmodule Greetings do
  def hello(name) do
    "Hello, #{name}!"
  end
end

["Ada", "Lin"]
|> Enum.each(fn name -> IO.puts(Greetings.hello(name)) end)`,
	},
	{
		id: 'glsl',
		label: 'GLSL',
		group: 'Programming',
		language: glsl,
		filename: 'gradient.frag',
		sample: `precision mediump float;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec3 color = mix(vec3(0.1), vec3(0.5, 0.8, 1.0), uv.y);
  gl_FragColor = vec4(color, 1.0);
}`,
	},
	{
		id: 'go',
		label: 'Go',
		group: 'Programming',
		language: go,
		filename: 'hello.go',
		sample: `package main

import "fmt"

func main() {
  for _, name := range []string{"Ada", "Lin"} {
    fmt.Printf("Hello, %s!\\n", name)
  }
}`,
	},
	{
		id: 'graphql',
		label: 'GraphQL',
		group: 'Data',
		language: graphql,
		filename: 'project.graphql',
		sample: `query Project($slug: String!) {
  project(slug: $slug) {
    name
    description
    languages {
      name
    }
  }
}`,
	},
	{
		id: 'groovy',
		label: 'Groovy',
		group: 'Programming',
		language: groovy,
		filename: 'greetings.groovy',
		sample: `class Greeting {
  String name
  String message() { "Hello, $name!" }
}

['Ada', 'Lin'].each { name ->
  println new Greeting(name: name).message()
}`,
	},
	{
		id: 'hcl',
		label: 'HCL',
		group: 'Configuration',
		language: hcl,
		filename: 'main.tf',
		sample: `variable "project_name" {
  type    = string
  default = "kirari"
}

locals {
  labels = { project = var.project_name, environment = "preview" }
}`,
	},
	{
		id: 'html',
		label: 'HTML',
		group: 'Web',
		language: html,
		filename: 'index.html',
		sample: `<!doctype html>
<html lang="en">
  <title>A little light</title>
  <main>
    <h1>Hello, Kirari!</h1>
    <p>Small tools. Clear ideas.</p>
    <a href="/playground">Explore the playground &rarr;</a>
  </main>
</html>`,
	},
	{
		id: 'ini',
		label: 'INI',
		group: 'Configuration',
		language: ini,
		filename: 'settings.ini',
		sample: `[application]
name = Kirari
mode = development

[server]
host = localhost
port = 3000`,
	},
	{
		id: 'java',
		label: 'Java',
		group: 'Programming',
		language: java,
		filename: 'Greeting.java',
		sample: `import java.util.List;

class Greeting {
  public static void main(String[] args) {
    for (String name : List.of("Ada", "Lin")) {
      System.out.println("Hello, " + name + "!");
    }
  }
}`,
	},
	{
		id: 'javascript',
		label: 'JavaScript',
		group: 'Programming',
		language: javascript,
		filename: 'hello.js',
		sample: `import { highlight } from '@vortexlabs/kirari'

const message = 'Hello, world!'
const html = highlight(message)

console.log(html)`,
	},
	{
		id: 'json',
		label: 'JSON',
		group: 'Data',
		language: json,
		filename: 'project.json',
		sample: `{
  "name": "Kirari",
  "description": "A little light for your code",
  "languages": ["javascript", "typescript", "css"],
  "browserReady": true,
  "dependencies": null
}`,
	},
	{
		id: 'jsonc',
		label: 'JSONC',
		group: 'Configuration',
		language: jsonc,
		filename: 'settings.jsonc',
		sample: `{
  // Keep the editor quiet and readable.
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "files.trimTrailingWhitespace": true
}`,
	},
	{
		id: 'jsx',
		label: 'JSX',
		group: 'Web',
		language: jsx,
		filename: 'Greeting.jsx',
		sample: `export function Greeting({ name = 'world' }) {
  return (
    <section className="greeting">
      <h1>Hello, {name}!</h1>
      <p>Make something small and useful.</p>
    </section>
  )
}`,
	},
	{
		id: 'julia',
		label: 'Julia',
		group: 'Programming',
		language: julia,
		filename: 'temperatures.jl',
		sample: `celsius = [18.0, 21.5, 24.0]
fahrenheit(c) = c * 9 / 5 + 32

for temperature in celsius
    converted = fahrenheit(temperature)
    println("$temperature °C = $converted °F")
end`,
	},
	{
		id: 'kotlin',
		label: 'Kotlin',
		group: 'Programming',
		language: kotlin,
		filename: 'Greeting.kt',
		sample: `data class Greeting(val name: String) {
    fun message() = "Hello, $name!"
}

fun main() {
    listOf("Ada", "Lin").forEach { name ->
        println(Greeting(name).message())
    }
}`,
	},
	{
		id: 'lua',
		label: 'Lua',
		group: 'Programming',
		language: lua,
		filename: 'greetings.lua',
		sample: `local names = { "Ada", "Lin", "Sam" }
local function greet(name)
  return "Hello, " .. name .. "!"
end

for _, name in ipairs(names) do
  print(greet(name))
end`,
	},
	{
		id: 'makefile',
		label: 'Makefile',
		group: 'Configuration',
		language: makefile,
		filename: 'Makefile',
		sample: `.PHONY: check build

check:
\tbun test
\tbun run typecheck

build: check
\tbun run build`,
	},
	{
		id: 'markdown',
		label: 'Markdown',
		group: 'Data',
		language: markdown,
		filename: 'welcome.md',
		sample: `# A little light

Kirari adds **color** to your code.

- Pick a language
- Write something useful
- Share what you learned

Visit the [playground](/playground) to try it.`,
	},
	{
		id: 'nginx',
		label: 'Nginx',
		group: 'Configuration',
		language: nginx,
		filename: 'nginx.conf',
		sample: `server {
  listen 80;
  server_name localhost;
  root /usr/share/nginx/html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}`,
	},
	{
		id: 'php',
		label: 'PHP',
		group: 'Programming',
		language: php,
		filename: 'greetings.php',
		sample: `<?php
function greet(string $name): string {
    return "Hello, {$name}!";
}

foreach (["Ada", "Lin"] as $name) {
    echo greet($name) . PHP_EOL;
}`,
	},
	{
		id: 'plaintext',
		label: 'Plain text',
		group: 'Data',
		language: plaintext,
		filename: 'notes.txt',
		sample: `A little light for your code

Pick a language and start typing.
Every character stays where you put it.
Spaces, symbols <>&, and ideas included.`,
	},
	{
		id: 'powershell',
		label: 'PowerShell',
		group: 'Programming',
		language: powershell,
		filename: 'greetings.ps1',
		sample: `param([string]$Name = "world")

function Get-Greeting($Person) {
  return "Hello, $Person!"
}

Write-Host (Get-Greeting $Name) -ForegroundColor Cyan`,
	},
	{
		id: 'protobuf',
		label: 'Protocol Buffers',
		group: 'Data',
		language: protobuf,
		filename: 'greeting.proto',
		sample: `syntax = "proto3";
package greetings;

message Greeting {
  string name = 1;
  string message = 2;
  repeated string languages = 3;
}`,
	},
	{
		id: 'python',
		label: 'Python',
		group: 'Programming',
		language: python,
		filename: 'greetings.py',
		sample: `from dataclasses import dataclass

@dataclass
class Greeting:
    name: str
    def message(self) -> str:
        return f"Hello, {self.name}!"

print(Greeting("Kirari").message())`,
	},
	{
		id: 'r',
		label: 'R',
		group: 'Programming',
		language: r,
		filename: 'temperatures.R',
		sample: `celsius <- c(18, 21.5, 24)
fahrenheit <- function(value) {
  value * 9 / 5 + 32
}

readings <- data.frame(celsius, fahrenheit = fahrenheit(celsius))
print(readings)`,
	},
	{
		id: 'ruby',
		label: 'Ruby',
		group: 'Programming',
		language: ruby,
		filename: 'greetings.rb',
		sample: `def greet(name)
  "Hello, #{name}!"
end

%w[Ada Lin Sam].each do |name|
  puts greet(name)
end`,
	},
	{
		id: 'rust',
		label: 'Rust',
		group: 'Programming',
		language: rust,
		filename: 'greetings.rs',
		sample: `fn greet(name: &str) -> String {
    format!("Hello, {name}!")
}

fn main() {
    for name in ["Ada", "Lin"] {
        println!("{}", greet(name));
    }
}`,
	},
	{
		id: 'scala',
		label: 'Scala',
		group: 'Programming',
		language: scala,
		filename: 'Greeting.scala',
		sample: `case class Greeting(name: String) {
  def message: String = s"Hello, $name!"
}

@main def greet(): Unit = {
  List("Ada", "Lin").foreach { name =>
    println(Greeting(name).message)
  }
}`,
	},
	{
		id: 'shell',
		label: 'Shell',
		group: 'Programming',
		language: shell,
		filename: 'greetings.sh',
		sample: `#!/bin/sh
set -eu

for name in Ada Lin Sam; do
  printf 'Hello, %s!\\n' "$name"
done`,
	},
	{
		id: 'sql',
		label: 'SQL',
		group: 'Data',
		language: sql,
		filename: 'projects.sql',
		sample: `SELECT
  language,
  COUNT(*) AS project_count
FROM projects
WHERE published = TRUE
GROUP BY language
HAVING COUNT(*) > 2
ORDER BY project_count DESC;`,
	},
	{
		id: 'svelte',
		label: 'Svelte',
		group: 'Web',
		language: svelte,
		filename: 'Greeting.svelte',
		sample: `<script>
  let name = 'world'
</script>

<label>
  Your name
  <input bind:value={name} />
</label>
<h1>Hello, {name}!</h1>`,
	},
	{
		id: 'swift',
		label: 'Swift',
		group: 'Programming',
		language: swift,
		filename: 'Greeting.swift',
		sample: `struct Greeting {
    let name: String
    var message: String { "Hello, \\(name)!" }
}

for name in ["Ada", "Lin"] {
    print(Greeting(name: name).message)
}`,
	},
	{
		id: 'toml',
		label: 'TOML',
		group: 'Configuration',
		language: toml,
		filename: 'project.toml',
		sample: `name = "kirari"
version = "0.1.0"
languages = ["javascript", "typescript"]

[preview]
host = "localhost"
port = 3000
enabled = true`,
	},
	{
		id: 'tsx',
		label: 'TSX',
		group: 'Web',
		language: tsx,
		filename: 'Greeting.tsx',
		sample: `type GreetingProps = { name: string }

export function Greeting({ name }: GreetingProps) {
  return (
    <section className="greeting">
      <h1>Hello, {name}!</h1>
    </section>
  )
}`,
	},
	{
		id: 'typescript',
		label: 'TypeScript',
		group: 'Programming',
		language: typescript,
		filename: 'greetings.ts',
		sample: `type Greeting = { name: string; message: string }

function greet(name: string): Greeting {
  return { name, message: \`Hello, \${name}!\` }
}

const greeting = greet('Kirari')
console.log(greeting.message)`,
	},
	{
		id: 'vue',
		label: 'Vue',
		group: 'Web',
		language: vue,
		filename: 'Greeting.vue',
		sample: `<script setup>
import { ref } from 'vue'
const name = ref('world')
</script>

<template>
  <input v-model="name" aria-label="Your name" />
  <h1>Hello, {{ name }}!</h1>
</template>`,
	},
	{
		id: 'xml',
		label: 'XML',
		group: 'Data',
		language: xml,
		filename: 'project.xml',
		sample: `<?xml version="1.0" encoding="UTF-8"?>
<project name="Kirari">
  <description>A little light &amp; color</description>
  <languages>
    <language extension=".js">JavaScript</language>
    <language extension=".ts">TypeScript</language>
  </languages>
</project>`,
	},
	{
		id: 'yaml',
		label: 'YAML',
		group: 'Configuration',
		language: yaml,
		filename: 'project.yaml',
		sample: `name: Kirari
preview:
  host: localhost
  port: 3000
languages:
  - javascript
  - typescript
description: >
  A little light for your code.`,
	},
	{
		id: 'zig',
		label: 'Zig',
		group: 'Programming',
		language: zig,
		filename: 'greetings.zig',
		sample: `const std = @import("std");

pub fn main() void {
    const names = [_][]const u8{ "Ada", "Lin" };
    for (names) |name| {
        std.debug.print("Hello, {s}!\\n", .{name});
    }
}`,
	},
]
