export class STARoll {
  async performAttributeTest(dicePool, usingFocus, usingDetermination,
    selectedAttribute, selectedAttributeValue, selectedDiscipline,
    selectedDisciplineValue, complicationRange, speaker) {
    // Define some variables that we will be using later.
    
    let i;
    let result = 0;
    let diceString = '';
    let success = 0;
    let complication = 0;
    const checkTarget = 
      parseInt(selectedAttributeValue) + parseInt(selectedDisciplineValue);
    const complicationMinimumValue = 20 - (complicationRange - 1);

    // Foundry will soon make rolling async only, setting it up as such now avoids a warning. 
    const r = await new Roll( dicePool + 'd20' ).evaluate( {async: true});
    
    // Now for each dice in the dice pool we want to check what the individual result was.
    for (i = 0; i < dicePool; i++) {
      result = r.terms[0].results[i].result;
      // If the result is less than or equal to the focus, that counts as 2 successes and we want to show the dice as green.
      if ((usingFocus && result <= selectedDisciplineValue) || result == 1) {
        diceString += '<li class="roll die d20 max">' + result + '</li>';
        success += 2;
        // If the result is less than or equal to the target (the discipline and attribute added together), that counts as 1 success but we want to show the dice as normal.
      } else if (result <= checkTarget) { 
        diceString += '<li class="roll die d20">' + result + '</li>';
        success += 1;
        // If the result is greater than or equal to the complication range, then we want to count it as a complication. We also want to show it as red!
      } else if (result >= complicationMinimumValue) {
        diceString += '<li class="roll die d20 min">' + result + '</li>';
        complication += 1;
        // If none of the above is true, the dice failed to do anything and is treated as normal.
      } else {
        diceString += '<li class="roll die d20">' + result + '</li>';
      }
    }

    // If using a Value and Determination, automatically add in an extra critical roll
    if (usingDetermination) {
      diceString += '<li class="roll die d20 max">' + 1 + '</li>';
      success += 2;
    }

    // Here we want to check if the success was exactly one (as "1 Successes" doesn't make grammatical sense). We create a string for the Successes.
    let successText = '';
    if (success == 1) {
      successText = success + ' ' + game.i18n.format('sta.roll.success');
    } else {
      successText = success + ' ' + game.i18n.format('sta.roll.successPlural');
    }

    // Check if we allow multiple complications, or if only one complication ever happens.
    const multipleComplicationsAllowed = game.settings.get('sta', 'multipleComplications');

    // If there is any complications, we want to crate a string for this. If we allow multiple complications and they exist, we want to pluralise this also.
    // If no complications exist then we don't even show this box.
    let complicationText = '';
    if (complication >= 1) {
      if (complication > 1 && multipleComplicationsAllowed === true) {
        const localisedPluralisation = game.i18n.format('sta.roll.complicationPlural');
        complicationText = '<h4 class="dice-total failure"> ' + localisedPluralisation.replace('|#|', complication) + '</h4>';
      } else {
        complicationText = '<h4 class="dice-total failure"> ' + game.i18n.format('sta.roll.complication') + '</h4>';
      }
    } else {
      complicationText = '';
    }

    // Set the flavour to "[Attribute] [Discipline] Attribute Test". This shows the chat what type of test occured.
    let flavor = '';
    switch (speaker.data.type) {
    case 'character':
      flavor = game.i18n.format('sta.actor.character.attribute.' + selectedAttribute) + ' ' + game.i18n.format('sta.actor.character.discipline.' + selectedDiscipline) + ' ' + game.i18n.format('sta.roll.task.name');
      break;
    case 'starship':
      flavor = game.i18n.format('sta.actor.starship.system.' + selectedAttribute) + ' ' + game.i18n.format('sta.actor.starship.department.' + selectedDiscipline) + ' ' + game.i18n.format('sta.roll.task.name');
    }

    // Build a dynamic html using the variables from above.
    const html = `
      <div class="sta roll attribute">
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">
              <table class="aim">
                <tr>
                  <td> ` + dicePool + `d20 </td>
                  <td> Target:` + checkTarget + ` </td>
                  <td> ` + game.i18n.format('sta.roll.complicationrange') + complicationMinimumValue + `+ </td>
                </tr>
              </table>
            </div>
            <div class="dice-tooltip">
              <section class="tooltip-part">
                <div class="dice">
                  <ol class="dice-rolls">` + diceString + `</ol>
                </div>
              </section>
            </div>` +
            complicationText +
            `<h4 class="dice-total">` + successText + `</h4>
          </div>
        </div>
        <div class="reroll-result attribute">
          <span>` + game.i18n.format('sta.roll.rerollresults') + `</span>
          <input id="selectedAttribute" type="hidden" value="` + selectedAttribute + `" >
          <input id="selectedAttributeValue" type="hidden" value="` + selectedAttributeValue + `" >
          <input id="selectedDiscipline" type="hidden" value="` + selectedDiscipline + `" >
          <input id="selectedDisciplineValue" type="hidden" value="` + selectedDisciplineValue + `" >
          <input id="speakerId" type="hidden" value="` + speaker.id + `" >
        </div>
      </div>`;

    // Check if the dice3d module exists (Dice So Nice). If it does, post a roll in that and then send to chat after the roll has finished. If not just send to chat.
    if (game.dice3d) {
      game.dice3d.showForRoll(r).then((displayed) => {
        this.sendToChat(speaker, html, r, flavor, 'sounds/dice.wav');
      });
    } else {
      this.sendToChat(speaker, html, r, flavor, 'sounds/dice.wav');
    };
  }
  
  async performChallengeRoll(dicePool, challengeName, speaker) {
    // Foundry will soon make rolling async only, setting it up as such now avoids a warning. 
    const rolledChallenge = await new Roll( dicePool + 'd6' ).evaluate( {async: true});

    const flavor = challengeName + ' ' + game.i18n.format('sta.roll.challenge.name');
    const successes = getSuccessesChallengeRoll( rolledChallenge );
    const effects = getEffectsFromChallengeRoll( rolledChallenge );
    const diceString = getDiceImageListFromChallengeRoll( rolledChallenge );
   
    // pluralize success string
    let successText = '';
    successText = successes + ' ' + i18nPluralize( successes, 'sta.roll.success' );
  
    // pluralize effect string
    let effectText = '';
    if (effects >= 1) {
      effectText = '<h4 class="dice-total effect"> ' + i18nPluralize( effects, 'sta.roll.effect' ) + '</h4>';
    }
    
    // Build a dynamic html using the variables from above.
    const html = `
      <div class="sta roll attribute">
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">
              <table class="aim">
                <tr>
                  <td> ` + dicePool + `d6 </td>
                </tr>
              </table>
            </div>
            <div class="dice-tooltip">
              <section class="tooltip-part">
                <div class="dice">
                  <ol class="dice-rolls">` + diceString + `</ol>
                </div>
              </section>
            </div>` +
              effectText +
              `<h4 class="dice-total">` + successText + `</h4>
            </div>
          </div>
          <div class="reroll-result challenge">
            <span>` + game.i18n.format('sta.roll.rerollresults') + `</span>
            <input id="speakerId" type="hidden" value="` + speaker.id + `" >
          </div>
        </div>
      </div>`;
      
    // Check if the dice3d module exists (Dice So Nice). If it does, post a roll in that and then send to chat after the roll has finished. If not just send to chat.
    if (game.dice3d) {
      game.dice3d.showForRoll(rolledChallenge).then((displayed) => {
        this.sendToChat(speaker, html, rolledChallenge, flavor, 'sounds/dice.wav');
      });
    } else {
      this.sendToChat(speaker, html, rolledChallenge, flavor, 'sounds/dice.wav');
    };
  }

  async performItemRoll(item, speaker) {
    // Create variable div and populate it with localisation to use in the HTML.
    const variablePrompt = game.i18n.format('sta.roll.item.quantity');
    const variable = `<div class='dice-formula'> `+variablePrompt.replace('|#|', item.data.data.quantity)+`</div>`;
    
    // Send the divs to populate a HTML template and sends to chat.
    this.genericItemTemplate(item.data.img, item.data.name,
      item.data.data.description, variable, null, item.data._id)
      .then((html)=>this.sendToChat(speaker, html));
  }

  async performTalentRoll(item, speaker) {
    // Send the divs to populate a HTML template and sends to chat.
    this.genericItemTemplate(item.data.img, item.data.name,
      item.data.data.description, null, null, item.data._id)
      .then((html)=>this.sendToChat(speaker, html));
  }

  async performFocusRoll(item, speaker) {
    // Send the divs to populate a HTML template and sends to chat.
    this.genericItemTemplate(item.data.img, item.data.name,
      item.data.data.description, null, null, item.data._id)
      .then((html)=>this.sendToChat(speaker, html));
  }

  async performValueRoll(item, speaker) {
    // Send the divs to populate a HTML template and sends to chat.
    this.genericItemTemplate(item.data.img, item.data.name,
      item.data.data.description, null, null, item.data._id)
      .then((html)=>this.sendToChat(speaker, html));
  }

  async performInjuryRoll(item, speaker) {
    // Send the divs to populate a HTML template and sends to chat.
    this.genericItemTemplate(item.data.img, item.data.name,
      item.data.data.description, null, null, item.data._id)
      .then((html)=>this.sendToChat(speaker, html));
  }

  async performWeaponRoll(item, speaker) {
    let actorSecurity = 0;
    if ( speaker.data.data.disciplines ) {
      actorSecurity = parseInt( speaker.data.data.disciplines.security.value );
    } else if ( speaker.data.data.departments ) {
      actorSecurity = parseInt( speaker.data.data.departments.security.value );
    }
    const calculatedDamage = item.data.data.damage + actorSecurity;
    // Create variable div and populate it with localisation to use in the HTML.

    let variablePrompt = game.i18n.format('sta.roll.weapon.damagePlural');
    if ( calculatedDamage == 1 ) {
      variablePrompt = game.i18n.format('sta.roll.weapon.damage');
    }
    const variable = `<div class='dice-formula'> `+variablePrompt.replace('|#|', calculatedDamage)+`</div>`;
    
    // Create dynamic tags div and populate it with localisation to use in the HTML.
    let tags = '';
    if (item.data.data.qualities.melee) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.melee') + '</div>';
    }
    if (item.data.data.qualities.ranged) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.ranged') + '</div>';
    }
    if (item.data.data.qualities.area) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.area') + '</div>';
    }
    if (item.data.data.qualities.intense) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.intense') + '</div>';
    }
    if (item.data.data.qualities.knockdown) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.knockdown') + '</div>';
    }
    if (item.data.data.qualities.accurate) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.accurate') + '</div>';
    }
    if (item.data.data.qualities.charge) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.charge') + '</div>';
    }
    if (item.data.data.qualities.cumbersome) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.cumbersome') + '</div>';
    }
    if (item.data.data.qualities.deadly) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.deadly') + '</div>';
    }
    if (item.data.data.qualities.debilitating) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.debilitating') + '</div>';
    }
    if (item.data.data.qualities.grenade) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.grenade') + '</div>';
    }
    if (item.data.data.qualities.inaccurate) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.inaccurate') + '</div>';
    }
    if (item.data.data.qualities.nonlethal) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.nonlethal') + '</div>';
    }

    if (item.data.data.qualities.hiddenx > 0) {
      tags += '<div class=\'tag\'> ' + game.i18n.format('sta.actor.belonging.weapon.hiddenx') + ' ' + item.data.data.qualities.hiddenx +'</div>';
    }
    if (item.data.data.qualities.piercingx > 0) {
      tags += '<div class=\'tag\'> '+game.i18n.format('sta.actor.belonging.weapon.piercingx') + ' ' + item.data.data.qualities.piercingx +'</div>';
    }
    if (item.data.data.qualities.viciousx > 0) {
      tags += '<div class=\'tag\'> '+game.i18n.format('sta.actor.belonging.weapon.viciousx') + ' ' + item.data.data.qualities.viciousx +'</div>';
    }

    const damageRoll = await new Roll( calculatedDamage + 'd6' ).evaluate( {async: true});
    const successes = getSuccessesChallengeRoll( damageRoll );
    const effects = getEffectsFromChallengeRoll( damageRoll );
    const diceString = getDiceImageListFromChallengeRoll( damageRoll );
       
    // pluralize success string
    let successText = '';
    successText = successes + ' ' + i18nPluralize( successes, 'sta.roll.success' );
  
    // pluralize effect string
    let effectText = '';
    if (effects >= 1) {
      effectText = '<h4 class="dice-total effect"> ' + i18nPluralize( effects, 'sta.roll.effect' ) + '</h4>';
    }
    
    const rollHTML = `
      <div class="sta roll attribute">
          <div class="dice-roll">
            <div class="dice-result">
              <div class="dice-tooltip">
                <section class="tooltip-part">
                  <div class="dice">
                    <ol class="dice-rolls">` + diceString + `</ol>
                  </div>
                </section>
              </div>` +
                effectText + `<h4 class="dice-total">` + successText + `</h4>
              </div>
            </div>
            <div class="reroll-result challenge">
              <span>` + game.i18n.format('sta.roll.rerollresults') + `</span>
              <input id="speakerId" type="hidden" value="` + speaker.id + `" >
            </div>
          </div>
        </div>`;
    
    // Send the divs to populate a HTML template and sends to chat.
    this.genericItemTemplate( 
      item.data.img, 
      item.data.name, 
      item.data.data.description, 
      variable, 
      tags, 
      item.data._id ).then( ( genericItemHTML ) => {
      const finalHTML = genericItemHTML + '</div>\n\n' + rollHTML;
      if (game.dice3d) {
        game.dice3d.showForRoll( damageRoll ).then( ()=> {
          this.sendToChat( speaker, finalHTML, '', null, 'sounds/dice.wav');
        });
      } else {
        this.sendToChat( speaker, finalHTML, '', null, 'sounds/dice.wav');
      };
    });
  }

  async performArmorRoll(item, speaker) {
    // Create variable div and populate it with localisation to use in the HTML.
    const variablePrompt = game.i18n.format('sta.roll.armor.protect');
    const variable = `<div class='dice-formula'> `+variablePrompt.replace('|#|', item.data.data.protection)+`</div>`;
    
    // Send the divs to populate a HTML template and sends to chat.
    this.genericItemTemplate(item.data.img, item.data.name,
      item.data.data.description, variable, null, item.data._id)
      .then((html)=>this.sendToChat(speaker, html));
  }

  async genericItemTemplate(img, name, description, variable, tags, itemId) {
    // Checks if the following are empty/undefined. If so sets to blank.
    const descField = description ? description : '';
    const tagField = tags ? tags : '';
    const varField = variable ? variable : '';

    // Builds a generic HTML template that is used for all items.
    const html = `<div class='sta roll generic' data-item-id="`+itemId+`">
                    <div class='dice-roll'>
                      <div class="dice-result">
                        <div class='dice-formula title'>
                          <img class='img' src=`+img+`></img>
                          <div>`+name+`</div>
                        </div>
                        `+varField+`
                        <div class="dice-tooltip">`+descField+`</div>
                        <div class='tags'> 
                          `+tagField+`
                        </div>
                      <div>
                    </div>
                  </div>`;

    // Returns it for the sendToChat to utilise.
    return html;
  }

  async sendToChat(speaker, content, roll, flavor, chatSound) {
    if (!chatSound) {
      chatSound = '';
    }
    // Send's Chat Message to foundry, if items are missing they will appear as false or undefined and this not be rendered.
    ChatMessage.create( {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker( {actor: speaker}),
      flavor: flavor,
      content: content,
      roll: roll,
      sound: chatSound
    }).then((msg) => {
      return msg;
    });
  }
}

/*
  Returns the number of successes in a d6 challenge die roll
*/
function getSuccessesChallengeRoll( roll ) {
  let dice = roll.terms[0].results.map( ( die ) => die.result);
  dice = dice.map( ( die ) => {
    if ( die == 2 ) {
      return 2;
    } else if (die == 1 || die == 5 || die == 6) {
      return 1;
    }
    return 0;
  });
  return dice.reduce( ( a, b ) => a + b, 0);
}

/*
  Returns the number of effects in a  d6 challenge die roll
*/
function getEffectsFromChallengeRoll( roll ) {
  let dice = roll.terms[0].results.map( ( die ) => die.result);
  dice = dice.map( ( die ) => {
    if (die>=5) {
      return 1;
    }
    return 0;
  });
  return dice.reduce( ( a, b ) => a + b, 0);
}

/*
  Creates an HTML list of die face images from the results of a challenge roll
*/
function getDiceImageListFromChallengeRoll( roll ) {
  let diceString = '';
  const diceFaceTable = [
    '<li class="roll die d6"><img src="systems/sta/assets/icons/ChallengeDie_Success1_small.png" /></li>',
    '<li class="roll die d6"><img src="systems/sta/assets/icons/ChallengeDie_Success2_small.png" /></li>',
    '<li class="roll die d6"><img src="systems/sta/assets/icons/ChallengeDie_Success0_small.png" /></li>',
    '<li class="roll die d6"><img src="systems/sta/assets/icons/ChallengeDie_Success0_small.png" /></li>',
    '<li class="roll die d6"><img src="systems/sta/assets/icons/ChallengeDie_Effect_small.png" /></li>',
    '<li class="roll die d6"><img src="systems/sta/assets/icons/ChallengeDie_Effect_small.png" /></li>'
  ];
  diceString = roll.terms[0].results.map( ( die ) => die.result).map( ( result ) => diceFaceTable[result - 1]).join( ' ' );   
  return diceString;
}

/*
  grabs the nationalized local reference, switching to the plural form if count > 1, also, replaces |#| with count, then returns the resulting string. 
*/
function i18nPluralize( count, localizationReference ) {
  if ( count > 1 ) {
    return game.i18n.format( localizationReference + 'Plural' ).replace('|#|', count);
  }
  return game.i18n.format( localizationReference ).replace('|#|', count);
} 
