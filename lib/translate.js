#!/usr/bin/env node

'use strict';

/* Imports */
const program = require('commander');
const request = require('request');
const url = require('url');
const languages = require('./languages');

/* Check if language options ar declared as environment variables */
const defaultSource = process.env.JA_GTC_SOURCE || undefined;
const defaultTarget = process.env.JA_GTC_TARGET || undefined;

/* Set default values if not explicitly declared */
if (defaultSource === undefined) {
  defaultSource = 'en';
}

if (defaultTarget === undefined) {
  defaultTarget = 'es';
}

/* Supported languages: https://cloud.google.com/translate/v2/translate-reference#supported_languages */

/* This function creates the URL to get the translation from Google's server
(source: https://ctrlq.org/code/19909-google-translate-api) */
function createTranslatorURL(sourceLang, targetLang, sourceText) {
  return url.format({
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
  .version('1.1.0')
  .usage('[options] <text ...>')
  .option('-a, --auto', 'Auto-detect source language')
  /* TODO: Create defaults and let users change them [auto, source, target] */
  .option('-d, --details', 'View details')
  .option('-l, --list', 'List all available languages')
  .option('-s, --source [language]', 'Source language [en]', new RegExp(languages.getLanguagesCodesRegex(), 'i'), defaultSource)
  .option('-t, --target [language]', 'Target language [es]', new RegExp(languages.getLanguagesCodesRegex(), 'i'), defaultTarget)
  .on('--help', () => {
    console.log('\nExamples:');
    console.log("\t$ translate 'I want to translate this text'");
    console.log("\t$ translate -s es -t en 'Quiero traducir este texto'");
    console.log("\t$ translate -s en -t es I want to translate this text");
    console.log("\t$ translate -a 'Au revoir' -d");
    console.log("\t$ pbpaste | translate # Mac");
  })
  .parse(process.argv);

/* This option shows all languages (code and name) */
if (program.list) {
  console.log(languages.getLanguagesList());
  process.exit(0);
}

function runTranslation(sourceText) {
  const sourceLang = (program.auto) ? 'auto' : program.source;
  const targetLang = program.target;

  const targetURL = createTranslatorURL(sourceLang, targetLang, sourceText);

  /* Performing the request */
  request(targetURL, (error, response, body) => {
      if ((!error) && (response.statusCode == 200)) {
        /*
        Retrieved results from Google's server:
        [[["Hola Mundo","Hello World",,,1]],,"en"]
        
        Parsed result (with language name):
        { targetText: 'Hola Mundo',
          sourceText: 'Hello World',
          confidence: 1,
          sourceLang: { code: 'en', language: 'English' },
          targetLang: { code: 'es', language: 'Spanish' }
        }
        */
       /* JSON.parse works but we delete null fields to get values in the same order */
        const intermed = body.replace(/,null{1,}/g, '');
        const values = JSON.parse(intermed);
        const sentences = values[0];
        let result = {
          targetText: '',
          sourceText: '',
          confidence: (program.auto) ? values[2] : 1, // if not lanaguage detection -> 1
          sourceLang: languages.getLanguage(values[1]), // language detection may be used
          targetLang: languages.getLanguage(targetLang)
        };

        /* Iterate over all sentences and put all text together */
        for (let i = 0; i < sentences.length; i++) {
          result.targetText += sentences[i][0]; // update target text
          result.sourceText += sentences[i][1]; // update source text
        }

        /* Prepare text */
        let textToPrint;

        if (program.details) {
          /* TODO: Check confidence when auto-detection is enabled to know if the translation is accurate. */
          textToPrint = '[' + result.sourceLang.name + ' -> ' + result.targetLang.name  + ']\n' + result.targetText;
        } else {
          textToPrint = result.targetText;
        }

        /* Finally: Show result and exit program */
        console.log(textToPrint);
        process.exit(0);

      } else {
        /* Something went wrong */
        console.log('⚠️  Cannot translate now, an error occurred 🙁');
        process.exit(1);
      }
    }
  );
};

/* Entry point */
if (program.args.length === 0) {
  /* Check if text is being piped (i.e. 'pbpaste | translate') */
  if (!process.stdin.isTTY) {
    let sourceText = '';

    process.stdin.on('readable', () => {
      let buf;
      while ((buf = process.stdin.read()) !== null) {
        sourceText += buf;
      }
    });

    process.stdin.on('end', () => {
      runTranslation(sourceText);
    });
  } else {
    /* No data is given -> print help */
    console.log('❗️ Cannot translate an empty text❗️');
    program.outputHelp();
  }
} else {
  /* Text to be translated is given as an argument(s) */
  /* It's better to type 'All the text inside simple quotes' but it's possible to use separated words */
  let sourceText = (program.args.length > 1)  ? program.args.join(' ') : program.args[0];
  runTranslation(sourceText);
}
