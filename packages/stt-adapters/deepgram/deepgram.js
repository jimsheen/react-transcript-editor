/**
 * Convert BBC Kaldi json to draftJs
 * see `sample` folder for example of input and output as well as `example-usage.js`
 *
 */

import generateEntitiesRanges from "./generate-entities-ranges/index.js";
// import groupWordsInParagraphsBySpeakers from "./group-words-by-speakers/index.js";
/**
 * groups words list from kaldi transcript based on punctuation.
 * @todo To be more accurate, should introduce an honorifics library to do the splitting of the words.
 * @param {array} words - array of words opbjects from kaldi transcript
 */

const groupWordsInParagraphs = (words) => {
  const results = [];
  let paragraph = { words: [], text: [] };

  words.forEach((word) => {
    // if word contains punctuation
    if (/[.?!]/.test(word.punctuated_word)) {
      paragraph.words.push(word);
      paragraph.text.push(word.punctuated_word);
      paragraph.text = paragraph.text.join(" ");
      results.push(paragraph);
      // reset paragraph
      paragraph = { words: [], text: [] };
    } else {
      paragraph.words.push(word);
      paragraph.text.push(word.punctuated_word);
    }
  });

  return results;
};

function groupWordsBySpeaker(wordsWithSpeakers) {
  let currentSpeaker = wordsWithSpeakers[0].speaker;

  const results = [];
  let paragraph = { words: [], text: "", speaker: "" };
  wordsWithSpeakers.forEach((word) => {
    // if current speaker same as word speaker add words to paragraph
    if (currentSpeaker === word.speaker) {
      paragraph.words.push(word);
      paragraph.text += word.punctuated_word + " ";
      paragraph.speaker = currentSpeaker;
    }
    // if it's not same speaker
    else {
      // update current speaker
      currentSpeaker = word.speaker;
      // remove spacing in text
      paragraph.text = paragraph.text.trim();
      //save  previous paragraph
      results.push(paragraph);
      // reset paragraph
      paragraph = { words: [], text: "", speaker: "U_UKN" };
      // add words attributes to new
      paragraph.words.push(word);
      paragraph.text += word.punctuated_word + " ";
    }
  });
  // add last paragraph
  results.push(paragraph);

  return results;
}

const groupWordsInParagraphsBySpeakers = (words) => {
  const results = [];
  let paragraph = { words: [], text: [] };

  words.forEach((word) => {
    // if word contains punctuation
    if (/[.?!]/.test(word.punctuated_word)) {
      paragraph.words.push(word);
      paragraph.text.push(word.punctuated_word);
      paragraph.text = paragraph.text.join(" ");
      paragraph.speaker = word.speaker;
      results.push(paragraph);
      // reset paragraph
      paragraph = { words: [], text: [] };
    } else {
      paragraph.words.push(word);
      paragraph.text.push(word.punctuated_word);
    }
  });

  return results;
};

const deepgram = (deepgramJson) => {
  const results = [];
  let tmpWords;
  let speakerSegmentation = null;
  let wordsByParagraphs = [];

  const hasSpeakers = !!deepgramJson.words[0].speaker !== undefined;

  // BBC Octo Labs API Response wraps Kaldi response around retval,
  // while kaldi contains word attribute at root
  if (deepgramJson.retval !== undefined) {
    tmpWords = deepgramJson.retval.words;
    if (deepgramJson.retval.segmentation !== undefined) {
      speakerSegmentation = deepgramJson.retval.segmentation;
    }
  } else {
    tmpWords = deepgramJson.words;
    if (deepgramJson.segmentation !== undefined) {
      speakerSegmentation = deepgramJson.segmentation;
    }
  }

  const grouped = groupWordsBySpeaker(tmpWords);

  if (hasSpeakers) {
    wordsByParagraphs = groupWordsBySpeaker(tmpWords);
  } else {
    wordsByParagraphs = groupWordsInParagraphs(tmpWords);
  }

  wordsByParagraphs.forEach((paragraph, i) => {
    // if paragraph contain words
    // eg sometimes the speaker segmentation might not contain words :man-shrugging:
    if (paragraph.words[0] !== undefined) {
      let speakerLabel = `TBC ${i}`;
      if (hasSpeakers) {
        speakerLabel = `speaker ${paragraph.speaker}`;
      }

      const draftJsContentBlockParagraph = {
        text: paragraph.text,
        type: "paragraph",
        data: {
          speaker: speakerLabel,
          words: paragraph.words,
          start: paragraph.words[0]?.start,
        },
        // the entities as ranges are each word in the space-joined text,
        // so it needs to be compute for each the offset from the beginning of the paragraph and the length
        entityRanges: generateEntitiesRanges(
          paragraph.words,
          "punctuated_word"
        ), // wordAttributeName
      };
      results.push(draftJsContentBlockParagraph);
    }
  });

  return results;
};

export default deepgram;
