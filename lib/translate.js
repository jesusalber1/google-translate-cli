#!/usr/bin/env node

'use strict';

var program = require('commander');
var request = require('request');
var URL = require('url');
var languages = require('./languages');
/* Supported languages: https://cloud.google.com/translate/v2/translate-reference#supported_languages */

/* This function creates the URL to get the translation from Google's server
(source: https://ctrlq.org/code/19909-google-translate-api) */
function createTranslatorURL(sourceLang, targetLang, sourceText) {
  return URL.format({
    protocol: 'https:',
    hostname: 'translate.googleapis.com',
    pathname: '/translate_a/single',
    query: {
      client: 'gtx',
      ie: 'UTF-8',
      oe: 'UTF-8',
      sl: sourceLang,
      tl: targetLang,
      dt: 't',
      // dj: 1, // For more detailed JSON response
      q: sourceText,
    }
  });
}

/* Commander configuration */
program
  .version('0.0.1')
  .usage('[options] <text ...>')
  .option('-a, --auto', 'Auto-detect source language')
  /* TODO: Create defaults and let users change them [auto, source, target] */
  .option('-d, --details', 'View details')
  .option('-l, --list', 'List all available languages')
  .option('-s, --source [language]', 'Source language [en]', new RegExp(languages.getLanguagesCodesRegex(), 'i'), 'en')
  .option('-t, --target [language]', 'Target language [es]', new RegExp(languages.getLanguagesCodesRegex(), 'i'), 'es')
  .on('--help', function () {
    console.log('  Examples:\n');
    console.log("     $ translate 'I want to translate this text'");
    console.log("     $ translate -s es -t en 'Quiero traducir este texto'");
    console.log("     $ translate -s en -t es I want to translate this text");
    console.log("     $ translate -a 'Au revoir' -d");
  })
  .parse(process.argv);

/* This option shows all languages (code and name) */
if (program.list) {
  console.log(languages.getLanguagesList());
  process.exit(0);
}

/* Let's translate! */
if (program.args.length == 0) {
  console.log('❗️ Cannot translate an empty text❗️');
  process.exit(1);
}

var sourceLang = (program.auto) ? 'auto' : program.source;
var targetLang = program.target;
/* I prefer typing 'All the text inside simple quotes' but it's possible to use separated words */
var sourceText = (program.args.length > 1)  ? program.args.join(' ') : program.args[0];
var targetURL = createTranslatorURL(sourceLang, targetLang, sourceText);

/* Performing the request */
request(targetURL, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      /* JSON.parse() doesn't work (empty values in array)
      Retrieved results from Google's server:
      [[["Hola Mundo","Hello World",,,1]],,"en"]

      Parsed results (with language name):
      { targetText: 'Hola Mundo',
        sourceText: 'Hello World',
        isReliable: 1,
        sourceLang: { code: 'en', language: 'English' },
        targetLang: { code: 'es', language: 'Spanish' }
      } */
      var values = body.match((/"([^"]+)"|(\d.)+/g));
      var results = {
        targetText : values[0].replace(/[\"]+/g, ''),
        sourceText : values[1].replace(/[\"]+/g, ''),
        isReliable : parseInt(values[2]),
        sourceLang : languages.getLanguage(values[3].replace(/[\"]+/g, '')),
        targetLang : languages.getLanguage(targetLang)
      }
      /* TODO: Check confidence when auto-detection is enabled to know if the translation is accurate. */
      if (program.auto) {
        results.confidence = parseFloat(values[6]);
      }

      /* Finally: Printing results */
      var textToPrint;
      if (program.details) {
        textToPrint = '[' + results.sourceLang.name + ' -> ' + results.targetLang.name  + ']\n' + results.targetText;
      } else {
        textToPrint = results.targetText;
      }
      console.log(textToPrint);
      process.exit(0);

    } else {
      /* Something went wrong */
      console.log('⚠️  Cannot translate now, an error occurred 🙁');
      process.exit(1);
    }
  }
);
