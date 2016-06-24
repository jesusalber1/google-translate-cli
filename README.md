# Google Translate via CLI

Translate texts using Google Translate from your terminal.

## Installation
```
npm install -g google-translate-cli
```
## Usage overview
```
  Usage: translate [options] <text ...>

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -a, --auto               Auto-detect source language
    -d, --details            View details
    -l, --list               List all available languages
    -s, --source [language]  Source language [en]
    -t, --target [language]  Target language [es]

  Examples:

     $ translate 'I want to translate this text'
     $ translate -s es -t en 'Quiero traducir este texto'
     $ translate -s en -t es I want to translate this text
     $ translate -a 'Au revoir' -d
```
Translations from English to Spanish by default.

## Examples
![Command examples](https://cloud.githubusercontent.com/assets/3829533/16347285/26f72b3e-3a4c-11e6-97e8-26ad3d02dc4f.png)

## TODO
* Add editable default options
* Add tests
