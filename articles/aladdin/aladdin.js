// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

var backgroundHeightForSearchResult = 95;
var backgroundHeightForAnswerQuestionSurvey = 35;



/**############################################################################################
 * # 
 * # Rendering functions
 * #
 * ############################################################################################
 **/

    // Used to render markdown sent from the Aladdin service into HTML
    function renderMarkDownTextAsHTML(text) {
        var converter = new showdown.Converter();
        var html = converter.makeHtml(text);
        
        // Replace anchors with inner text
        var anchor = $(html).find('a');
        html = anchor.length > 0 ? $(html).find('a').replaceWith(function(){ return this.innerHTML }).end().outerHTML() : html;

        var paragraph = $(html).filter('p');
        html = paragraph.length > 0 ? $(html).css('margin', '0').outerHTML() : html;

        return html;
    }

    /** If we don't find a relevant content, we show a message and ask the user to repeat the query. */
    function noRelatedContentFound(query) {
        loggingContentSearchResult(query, [], 'No Related Content Found');
        
        $('#contentPreviewSearchMessage').html("<div class='aladdin-no-related-content-found'> Sorry, we dont have any insights related to this topic right now. </div>");
        
        GM_setValue("no-related-content-found", true);
    }

    /** This function updates the content when a new question is asked. */
    function showSearchResult(contents) {
        Cache_setValue("selectedPreviewCard", null);
        var suggestedBlocks = buildPreviewCards(contents);

        /** Attach the new content */
        $('#contentPreviewSearchMessage').empty();
        $('#aladdin-preview-holder').html(suggestedBlocks);
        $(".aladdin-content-preview-holder").slideDown("fast");

        attachPreviewCardsEvents(contents);
    }

     /** This is a helper function to render the preview of the content of each answer. */
     function renderContentPreview(content, index) {
        var result = '<div data-index=' + index + ' id="contentPreview_' + index + '" class="aladdin-content-preview-block">';
        result +=   '<div class="aladdin-content-preview-text">';
        result +=       '<div class="aladdin-content-preview-text-holder">';
        result +=           '<label>' + content.title + '</label>';
        result +=       '</div>';
        result +=   '</div>';
        result += '</div>';

        Cache_setValue('contentPreviewTitle_' + index, content.title);
        Cache_setValue('contentPreviewSnippet_' + index, content.snippet);
        Cache_setValue('contentPreviewLink_' + index, content.link);
        Cache_setValue('contentPreviewSource_' + index, content.source);
        Cache_setValue('contentPreviewSearchCard_' + index, false);
        return result;
    }

    // Renders the Search preview
    function renderSearchPreviewCard(index) {
        var result = '<div data-index=' + index + ' id="contentPreview_' + index + '" class="aladdin-content-preview-block">';
        result +=   '<div class="aladdin-content-preview-text">'
        result +=       '<label>Ask a question</label>';
        result +=   '</div>';
        result += '</div>';
    
        Cache_setValue('contentPreviewTitle_' + index, '');
        Cache_setValue('contentPreviewSnippet_' + index, '');
        Cache_setValue('contentPreviewLink_' + index, '');
        Cache_setValue('contentPreviewSource_' + index, '');
        Cache_setValue('contentPreviewSearchCard_' + index, true);
        return result;
    }

    function getPreviewCardsCount(contents) {
        return contents.length > 3 ? 3 : contents.length;
    }

    /* Build small preview cards */
    function buildPreviewCards(contents) {
        var cardCount = getPreviewCardsCount(contents);

        var suggestedBlocks = "";
        for (var i = 0; i < cardCount; i++) {
            suggestedBlocks += renderContentPreview(contents[i], i);
        }
        return suggestedBlocks;
    }

    function buildSuggestedContent(contents, showAnswerQuestionSurvey) {
        /** Drawing preview boxes */
        var suggestedBlocks = "";

        if (showAnswerQuestionSurvey) {
            suggestedBlocks += '<div class="aladdin-answer-question-survey">This page answered my question</div>'
        }

        suggestedBlocks += "<div id='aladdin-search-holder'>";
        suggestedBlocks += "</div>";

        suggestedBlocks += "<div id='aladdin-preview-holder' class='aladdin-content-preview-holder'>"
        if (contents.length) {
            suggestedBlocks += buildPreviewCards(contents);
            suggestedBlocks += renderSearchPreviewCard(getPreviewCardsCount(contents));
        }
        suggestedBlocks += "</div>";

        // Content box holder
        suggestedBlocks += "<div id='aladdin-content-box-holder'></div>";

        return suggestedBlocks;
    }

    // Activated by a script included with the HTML content
    function closeSearchCard() {
        let initialAladdinContent = Cache_getValue("aladdinInitialContent");

        if ($("#aladdin-search-holder").children().length && initialAladdinContent.length) {
            $("#aladdin-search-block-holder").fadeOut("fast", function () {
                let suggestedBlocks = buildPreviewCards(initialAladdinContent);
                suggestedBlocks += renderSearchPreviewCard(getPreviewCardsCount(initialAladdinContent));

                $("#aladdin-preview-holder").html(suggestedBlocks);
                attachPreviewCardsEvents(initialAladdinContent);

                $(".aladdin-content-preview-holder").slideDown("fast", function () {
                    $("#aladdin-search-block-holder").remove();
                    $("#aladdin-content-box-holder").children().remove();
                });

                Cache_setValue("selectedPreviewCard", null);
            });
        }
    }

    function attachSearchCardEvents() {
        /** Add click event to the search ask button */
        $("#aladdin-content-search-icon").click(function () {
            performSearch();
        });

        $("#aladdin-query").keypress(function (e) {
            /** Add an event to support pressing enter in the question bar */
            if (e.which == 13) {
                performSearch();
            }
        });

        $("#aladdin-close-search-icon").click(function (){
            closeSearchCard();
        })
    }

    function attachInfoCardEvents() {
        /** Add click event to the preview card */
        $("#surveyYesButton").click(function () {
            if ($("#surveyYesButton").hasClass("aladdin-content-survey-button")) {
                loggingHelpfulContentClick(helpfulSurveyYesAnswer);

                $("#surveyYesButton").toggleClass("aladdin-content-survey-button aladdin-content-survey-button-selected");
                $("#surveyNoButton").toggleClass("aladdin-content-survey-button aladdin-content-survey-button-unselected");
            }
        });

        $("#surveyNoButton").click(function () {
            if ($("#surveyNoButton").hasClass("aladdin-content-survey-button")) {
                loggingHelpfulContentClick(helpfulSurveyNoAnswer);

                $("#surveyNoButton").toggleClass("aladdin-content-survey-button aladdin-content-survey-button-selected");
                $("#surveyYesButton").toggleClass("aladdin-content-survey-button aladdin-content-survey-button-unselected");
            }
        });

        $("#see-more-link").click(function () {
            var link = $(this).attr('href');
            loggingContentLinkClick(link);
        });

        $("#infoCardTitleHeightToggle").click(function () {
            var title = $("#infoCardTitle");
            var button = $("#infoCardTitleHeightToggle");
            var overflowClass = "aladdin-content-comment-title-overflow";

            if (title.hasClass(overflowClass)) {
                title.removeClass(overflowClass);
                button.text("LESS");
            } else {
                title.addClass(overflowClass);
                button.text("MORE");
            }
        })

        $("#infoCardBodyHeightToggle").click(function () {
            var body = $("#infoCardBody");
            var button = $("#infoCardBodyHeightToggle");
            var overflowClass = "aladdin-content-block-text-overflow";

            if (body.hasClass(overflowClass)) {
                body.removeClass(overflowClass);
                button.text("LESS");
            } else {
                body.addClass(overflowClass);
                button.text("MORE");
            }
        })
    }

    function getSelectedPreviewCardDetails() {
        var previewsSelectedCard = Cache_getValue("selectedPreviewCard");
        var index = previewsSelectedCard.context.attributes['data-index'].value;
        
        var title = Cache_getValue('contentPreviewTitle_' + index);
        var link = Cache_getValue('contentPreviewLink_' + index);
        var isSearchResult = $("#aladdin-search-holder").children().length > 0;
        var contentSource = Cache_getValue("contentPreviewSource_" + index);

        return {
            title: title, 
            link: link,
            isSearchResult: isSearchResult,
            contentSource: contentSource
        };
    }

    function unselectPreviewCard() {
        var previewsSelectedCard = Cache_getValue("selectedPreviewCard");
        if (previewsSelectedCard) {
            previewsSelectedCard.toggleClass("aladdin-content-preview-block aladdin-content-preview-selected");
            Cache_setValue("selectedPreviewCard", null);
        }
    }

    function performSearch() {
        var query = $('#aladdin-query').val();
        if (query && query.trim() !== "") {
            loggingContentSearch(query);
            if(GM_getValue("no-related-content-found")){
                $(".aladdin-no-related-content-found").remove();
                GM_setValue("no-related-content-found", false);
            }
            $('#contentPreviewSearchMessage').html("<div class='aladdin-no-related-content-found'><div class='spinner'></div></div>");
            
            $("#aladdin-preview-holder").children().remove();
            $("#aladdin-content-box-holder").children().remove();

            getSearchResults(query);
        }
    }

    function displayInfoCard(index) {
        // Create the new info card
        var title = Cache_getValue('contentPreviewTitle_' + index);
        var source = Cache_getValue('contentPreviewSource_' + index);
        var snippet = Cache_getValue('contentPreviewSnippet_' + index);
        var link = Cache_getValue('contentPreviewLink_' + index) + "#" + azureDocHelperURLMarker;
        var infoCardIsVisible = $("#aladdin-content-box-holder").children().length;

        var content = ""
        content += "<div class='aladdin-info-card-text'>";
        content +=    "<div id='infoCardTitle' class='aladdin-content-comment-title aladdin-content-comment-title-overflow'>" + title + "</div>";
        content +=    "<div id='infoCardBody' class='aladdin-content-block-text aladdin-content-block-text-overflow'>";
        content += renderMarkDownTextAsHTML(snippet.charAt(0).toUpperCase() + snippet.slice(1));
        content +=    "</div>";
        content += "</div>";

        // Card footer
        content += "<div class='aladdin-content-block-controls'>";
        content +=    "<div style='display:flex;font-size:12px;margin-left:25px;margin-right:25px'>"
        content +=      "<div>Was this helpful? <span id='surveyYesButton' class='aladdin-content-survey-button'>YES</span> <span id='surveyNoButton' class='aladdin-content-survey-button'>NO</span> </div>"
        content +=      "<div><a id='see-more-link' target='_blank' href='" + link + "'>GO TO ORIGINAL ARTICLE ></a><div>";
        content +=    "</div>"
        content += "</div>";

        var cardContent = "<div class='aladdin-content-block-holder'>"
        cardContent +=  "<div class='aladdin-content-block'>" + content + "</div>";
        cardContent += "</div>";

        // Show new info card
        $("#aladdin-content-box-holder").html(cardContent);
        if (infoCardIsVisible) {
            $(".aladdin-content-block-holder").show();
            $(".aladdin-info-card-text").fadeIn("slow");
        } else {
            $(".aladdin-info-card-text").show();
            $(".aladdin-content-block-holder").slideDown();
        }
        resizeInfoCardContent();        
        attachInfoCardEvents();
    }

    function resizeInfoCardContent() {
        var titleElement = document.getElementById("infoCardTitle");
        var bodyElement = document.getElementById("infoCardBody");
        var title = $("#infoCardTitle");
        var body = $("#infoCardBody");
        
        // Show MORE buttons
        if (titleElement.offsetHeight < titleElement.scrollHeight || titleElement.offsetWidth < titleElement.scrollWidth) {
            title.after("<div id='infoCardTitleHeightToggle' class='aladdin-content-more-button'>MORE</div>");
        } else {
            title.removeClass("aladdin-content-comment-title-overflow");
            title.addClass("aladdin-content-comment-title-singleLine");

            if (titleElement.offsetHeight < titleElement.scrollHeight || titleElement.offsetWidth < titleElement.scrollWidth) {
                title.removeClass("aladdin-content-comment-title-singleLine");
            }
        }

        if (bodyElement.offsetHeight + 20 < bodyElement.scrollHeight || bodyElement.offsetWidth < bodyElement.scrollWidth) {
            body.after("<div id='infoCardBodyHeightToggle' class='aladdin-content-more-button'>MORE</div>");
        }
    }

    function renderSearchBox(index) {
        // Drawing content box
        var content = "";
        var cardContent = "";
        
        content += "<div class='aladdin-content-block'>";
        if (index > 0) {
            content +=   "<i id='aladdin-close-search-icon' class='ms-Icon ms-Icon--ChromeClose aladdin-content-close-icon'></i>";
        }
        content +=   "<h3 style='margin: 0; font-size: 18px'>Ask a question</h3>";
        content +=   "<div class='aladdin-content-block-text'>";
        content +=      "<div>";
        content +=          "<label class='aladdin-content-search-icon' id='aladdin-content-search-icon'><i class='ms-Icon ms-Icon--Search'></i></label>"
        content +=          "<input type='text' id='aladdin-query' class='aladdin-content-preview-search-box' placeholder='What is...?'>";
        content +=      "</div>";
        content +=   "</div>";
        content += "</div>";
        content += "<div id='contentPreviewSearchMessage'></div>";
        
        cardContent += "<div id='aladdin-search-block-holder' class='aladdin-search-block-holder'>"
        cardContent +=    "<div>" + content + "</div>";
        cardContent += "</div>";

        return cardContent;
    }

    function displaySearchBox(index) {
        // Create the new info card
        var cardContent = renderSearchBox(index);

        $("#aladdin-search-holder").html(cardContent);
        $(".aladdin-content-block").addClass("aladdin-search-box");
        
        // Show search box
        if (index > 0) {
            // There are other preview cards
            $(".aladdin-content-preview-holder").fadeOut("fast", function () {
                $("#aladdin-search-block-holder").slideDown("fast", function () {
                    $("#aladdin-content-search-icon").fadeIn();
                    $("#aladdin-content-box-holder").empty();
                    $('#aladdin-query').focus();
                });
            });
        } else {
            // There are no other preview cards
            $("#aladdin-search-block-holder").fadeIn();
            $("#aladdin-content-search-icon").show();
            $("#aladdin-content-box-holder").empty();
            $('#aladdin-query').focus();
        }

        $("#aladdin-preview-holder").children().remove();
        $("#aladdin-content-box-holder").children().remove();

        unselectPreviewCard();
        attachSearchCardEvents();
    }

    // Draw Info card.
    function handlePreviewCardClick(index) {
        var isSearchBox = Cache_getValue('contentPreviewSearchCard_' + index);

        if (isSearchBox) {
            loggingSearchPreviewCardClicked();
            displaySearchBox(index);
        } else {
            loggingPreviewCardClicked();            
            displayInfoCard(index);
        }
    }
    
    function attachPreviewCardsEvents(contents) {
        for (var i = 0; i <= contents.length; i++) {
            $("#contentPreview_" + i).click(function () {
                var index = $(this).context.attributes['data-index'].value;
                var isSearchBox = Cache_getValue('contentPreviewSearchCard_' + index);
                var previewsSelectedCard = Cache_getValue("selectedPreviewCard");

                if (!previewsSelectedCard || index !== previewsSelectedCard.context.attributes['data-index'].value) {
                    $(this).toggleClass("aladdin-content-preview-block aladdin-content-preview-selected");
                    if (previewsSelectedCard) previewsSelectedCard.toggleClass("aladdin-content-preview-block aladdin-content-preview-selected");
                    Cache_setValue("selectedPreviewCard", $(this));

                    // Hide existing info card and show new one
                    var infoCard = $("#aladdin-content-box-holder").children();
                    if (isSearchBox && infoCard.length > 0) {
                        $("#aladdin-content-search-icon").fadeOut();
                        infoCard.slideUp("fast", function () {
                            handlePreviewCardClick(index);
                        });
                    } else {
                        handlePreviewCardClick(index);                            
                    }
                }                
            });
        }
    }

    function attachAnswerQuestionSurveyEvents() {
        var surveyComponent = $(".aladdin-answer-question-survey");

        surveyComponent.click(function () {
            surveyComponent.text('Thanks for the feedback!');
            surveyComponent.toggleClass('aladdin-answer-question-survey aladdin-answer-question-survey-response');

            loggingQuestionAnswered();
        });
    }

    /** Once all the initial records have been identified, we build the initial content in this function and attach it to the content block for the user to view*/
    function buildSuggestedPreviewCards(contents, jNode, showAnswerQuestionSurvey) {
        let suggestedBlocks = '';
        suggestedBlocks += buildSuggestedContent(contents, showAnswerQuestionSurvey);

        /* Cache initial aladdin content */
        Cache_setValue('aladdinInitialContent', contents);

        /** Attach the new content */
        $('#aladdin-current-content').html(suggestedBlocks);

        if (showAnswerQuestionSurvey) {
            attachAnswerQuestionSurveyEvents();
        }

        if (!contents.length) {
            displaySearchBox(contents.length);
        }

        attachPreviewCardsEvents(contents);
    }

    /** This function analyzes the current paragraph to find code blocks or glossary terms, it starts with code blocks */
    function getSearchResults(userQuery) {
        var result = [];

        var generateCardsInput = {
            paragraphText: "",
            currentPageUrl: window.location.href,
            query: userQuery
        }

        var theUrl = "https://aladdinservice.azurewebsites.net/generateCards";
         console.log(theUrl);
        $.ajax({
            method: "POST",
            url: theUrl,
             //, "Access-Control-Allow-Origin": "*"},
            contentType: "application/json",
            data: JSON.stringify(generateCardsInput),
            dataType: 'json',
            timeout: 5000, 
            success: function (data) {
                loggingContentSearchResult(userQuery, data, 'Success');
                if(data && data.length > 0)
                    showSearchResult(data);
                else
                    noRelatedContentFound(userQuery);
            },
            error: function (jqxhr, textStatus, e) {
                noRelatedContentFound(userQuery);
            }
        });
    }

    /** This function analyzes the current paragraph to find code blocks or glossary terms, it starts with code blocks */
    function getPreviewCards(elements, jNode, showAnswerQuestionSurvey) {
        // this is a hack as the above global does not seem to be used - jasonsha
        jQuery.fn.outerHTML = function() {
            return (this[0]) ? this[0].outerHTML : '';
         };

        var result = [];
        var inputElements = "";
        for (var i = 0; i < elements.length; i++) {
            inputElements += $(elements[i]).outerHTML();
        }
        var generateCardsInput = {
            paragraphText: "<div id='dummyHeader'>" + inputElements + "</div>",
            currentPageUrl: window.location.href,
            query: ""
        }

        var theUrl = "https://aladdinservice.azurewebsites.net/generateCards";        
        var inputText = JSON.stringify(generateCardsInput);

        console.log({ AladdinUrl: theUrl, data: inputText});


        $.ajax({
            method: "POST",
            url: theUrl,
             //, "Access-Control-Allow-Origin": "*"},
            contentType: "application/json",
            data: inputText,
            dataType: 'json',
            success: function (data) {
                loggingAladdinActivationInitialContent(data);

                /** Once we find all code blocks and glossary terms we need to add these elements to the UI */
                buildSuggestedPreviewCards(data, jNode, showAnswerQuestionSurvey);
            },
            error: function (jqxhr, textStatus, e) {
                console.log("Error: Azure Search Call fails");
            }
        });
    }

    /** This creates the content frame with the initial questions related to this section */
    function openContentFrame(jNode, showAnswerQuestionSurvey, readFrom) {
        var readText = readFrom;

        if (readText.length === 0){
            readText = 'h2:first';
        }
        
        var prevElement = jNode.prevAll(readText);

        if (prevElement.length === 0 || prevElement.text() === "") {
            prevElement = jNode.prevAll(':last');
        }

        var elements = prevElement.nextUntil(jNode).andSelf();

        let spinnerBlock = '';
        spinnerBlock += '<div class="aladdin-content" id="aladdin-current-content">';
        spinnerBlock += '<div class="aladdin-no-related-content-found"><div class="spinner"></div></div>';
        spinnerBlock += '</div>';
        jNode.after(spinnerBlock);
        $("#aladdin-current-content").slideDown("fast");

        /** This function creates the initial content */
        getPreviewCards(elements, jNode, showAnswerQuestionSurvey);
    }

    var globalCache = {}
    function Cache_setValue(name, value){
        globalCache[name]=value;
    }

    function Cache_getValue(name){
        return globalCache[name];
    }

    function handleInteractionLinesClick(name, readUntil, hookDivId, showAnswerQuestionSurvey = false) {
        var title = name;
        var jNode = $(hookDivId);
        var chevronDown = '<div><i class="ms-Icon ms-Icon--ChevronDown"></i></div>';
        var chevronUp = '<div><i class="ms-Icon ms-Icon--ChevronUp"></i></div>';

        // Case 1: No card window is exposed to user.
        if (!Cache_getValue("current-aladdin-hook-id")) {
            Cache_setValue("current-telemetry-source", window.location.href + "#" + title);
            Cache_setValue("current-aladdin-hook-id", title + '-aladdin-hook');
            Cache_setValue("current-aladdin-question-icon", hookDivId +  '-question-icon');
            Cache_setValue("selectedPreviewCard", null);

            $(hookDivId + '-question-icon').toggleClass("question-icon collapse-icon")
            $(hookDivId + ' div.question-border').css("border-top", "dotted 1px #C4C4C4");
            $(hookDivId + '-question-icon').html('Related Questions' + chevronUp );

            loggingAladdinActivation(window.location.href + "#" + title);
            openContentFrame(jNode, showAnswerQuestionSurvey, readUntil);
        }
        // Case 2: Card window is exposed, user clicks on other card window button.
        else if(Cache_getValue("current-aladdin-hook-id") !== title + '-aladdin-hook'){
            loggingAladdinDeactivation();
            $("#aladdin-current-content").remove();

            $("#" + Cache_getValue("current-aladdin-question-icon")).toggleClass("question-icon collapse-icon");
            $("#" + Cache_getValue("current-aladdin-question-icon")).html('Related Questions' + chevronDown);
            $("#" + Cache_getValue("current-aladdin-hook-id")+" div.question-border").css("border-top", "dotted 1px #C4C4C4");     
            $(hookDivId + '-question-icon').html('Related Questions' + chevronUp);           

            $(hookDivId + '-question-icon').toggleClass("question-icon collapse-icon");
            $(hookDivId + ' div.question-border').css("border-top", "dotted 1px #C4C4C4");
            
            Cache_setValue("current-telemetry-source", window.location.href + "#" + title);
            Cache_setValue("current-aladdin-hook-id", title + '-aladdin-hook');
            Cache_setValue("current-aladdin-question-icon", hookDivId +  '-question-icon');
            Cache_setValue("selectedPreviewCard", null);
            loggingAladdinActivation(window.location.href + "#" + title);
            openContentFrame(jNode, showAnswerQuestionSurvey, readUntil);
        }
        // Case 3: Card window is exposed, user clicks on this card window button.
        else{
            $(hookDivId + '-question-icon').toggleClass("question-icon collapse-icon")

            loggingAladdinDeactivation();
            $("#aladdin-content-search-icon").hide();
            $("#aladdin-current-content").slideUp("fast", function () {
                $("#aladdin-current-content").remove();

                $(hookDivId + ' div.question-border').css("border-top", "dotted 1px #C4C4C4");
                $(hookDivId + '-question-icon').html('Related Questions' + chevronDown);
            })
            if (Cache_getValue("current-aladdin-hook-id") != "") {
                Cache_setValue("current-aladdin-hook-id", "");
            }
            Cache_setValue("selectedPreviewCard", null);                
        }
    }        




    var keyPrefix = "Aladdin_keyprefix.";

    /** getValue and setValue functions */
    GM_getValue = function (key, defValue) {
        var retval = window.localStorage.getItem(keyPrefix + key);
        return retval;
    }

    GM_setValue = function (key, value) {
        try {
            window.localStorage.setItem(keyPrefix + key, value);
        } catch (e) {
            GM_log("error setting value: " + e);
        }
    }

    GM_setValue("current-aladdin-hook-id", "");
    
    window.addEventListener("beforeunload", function (e) {
        loggingNavigationAwayFromPage()
    });


/**############################################################################################
 * # 
 * # Logging functions
 * #
 * ############################################################################################
 **/

var azureDocHelperURLMarker = "AzureDocHelper";
var helpfulSurveyYesAnswer = "ContentIsHelpful";
var helpfulSurveyNoAnswer = "ContentIsNotHelpful";

var appInsights = function(a){
    function b(a){c[a]=function(){var b=arguments;c.queue.push(function(){c[a].apply(c,b)})}}var c={config:a},d=document,e=window;setTimeout(function(){var b=d.createElement("script");b.src=a.url||"https://az416426.vo.msecnd.net/scripts/a/ai.0.js",d.getElementsByTagName("script")[0].parentNode.appendChild(b)});try{c.cookie=d.cookie}catch(a){}c.queue=[];for(var f=["Event","Exception","Metric","PageView","Trace","Dependency"];f.length;)b("track"+f.pop());if(b("setAuthenticatedUserContext"),b("clearAuthenticatedUserContext"),b("startTrackEvent"),b("stopTrackEvent"),b("startTrackPage"),b("stopTrackPage"),b("flush"),!a.disableExceptionTracking){f="onerror",b("_"+f);var g=e[f];e[f]=function(a,b,d,e,h){var i=g&&g(a,b,d,e,h);return!0!==i&&c["_"+f](a,b,d,e,h),i}}return c
}({
    instrumentationKey: "f0ec6070-9261-4be6-8a1b-a9062038064c",
});


function sendMessage(request, sender, sendResponse) {
    if(request.action === "analytics_add_item"){

      if(request.event_name === "ComponentOnPage") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source});
      } else if(request.event_name === "NavigateToContentClicked") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source, "link": request.event_link});
      } else if (request.event_name === "ContentIsHelpful" || request.event_name === "ContentIsNotHelpful") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source, "title": request.event_title, "link": request.event_link, "contentSource": request.event_contentSource});
      } else if (request.event_name === "SearchQuerySubmitted") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source, "query": request.event_content});            
      } else if(request.event_name === "SearchResultsRetrieved") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source, "query": request.event_content, "result": JSON.stringify(request.event_result), "message": request.event_message})
        appInsights.trackTrace(JSON.stringify({"event":request.event_name, "source": request.event_source, "query": request.event_content, "result": JSON.stringify(request.event_result), "message": request.event_message}));
      } else if (request.event_name === "ComponentOpened") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source});            
      } else if(request.event_name === "InitialContentRetrieved") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source, "result": JSON.stringify(request.event_result)})
        appInsights.trackTrace(JSON.stringify({"event":request.event_name, "source": request.event_source, "result": JSON.stringify(request.event_result)}));
      } else if (request.event_name === "ComponentClosed") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source});            
      } else if (request.event_name === "NavigationAwayFromPage") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source});            
      } else if (request.event_name === "SearchPreviewCardClicked") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source});            
      } else if (request.event_name === "PreviewCardClicked") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source, "title": request.event_title, "link": request.event_link, "isSearchResult": request.event_isSearchResult, "contentSource": request.event_contentSource});
      } else if (request.event_name === "QuestionAnswered") {
        appInsights.trackEvent(request.event_name, {"source": request.event_source});            
      }
    }
};

/* Logging Aladdin component rendered */
function loggingAladdinRenderedInPage() {
    var eventName = "ComponentOnPage";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_source: source
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging Click on SEE MORE link */
function loggingContentLinkClick(link) {
    var eventName = "NavigateToContentClicked";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_link: link,
        event_source: source
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging 'Got it' button clicked */
function loggingHelpfulContentClick(value) {
    var eventName = value;
    var source = Cache_getValue("current-telemetry-source");
    var selectedPreviewCardInfo = getSelectedPreviewCardDetails();
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_source: source,
        event_title: selectedPreviewCardInfo.title,
        event_link: selectedPreviewCardInfo.link,
        event_contentSource: selectedPreviewCardInfo.contentSource
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging executing a Search */
function loggingContentSearch(query) {
    var eventName = "SearchQuerySubmitted";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_content: query,
        event_source: source
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging Search result retrieved */
function loggingContentSearchResult(query, results, message) {
    var eventName = "SearchResultsRetrieved";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_content: query,
        event_source: source,
        event_result: results,
        event_message: message
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging Aladdin component expanded */
function loggingAladdinActivation(source) {
    var eventName = "ComponentOpened";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_source: source
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging Aladdin preview cards content retrieved */
function loggingAladdinActivationInitialContent(result) {
    var eventName = "InitialContentRetrieved";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_source: source,
        event_result: result
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging Aladdin component closed */
function loggingAladdinDeactivation() {
    var eventName = "ComponentClosed";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_source: source
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging closing browser tab or navigate back button or entering a new URL */
function loggingNavigationAwayFromPage() {
    var eventName = "NavigationAwayFromPage";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_source: source
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging clicking on a Search preview card */
function loggingSearchPreviewCardClicked() {
    var eventName = "SearchPreviewCardClicked";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_source: source
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging clicking on a preview card */
function loggingPreviewCardClicked() {
    var eventName = "PreviewCardClicked";
    var source = Cache_getValue("current-telemetry-source");
    var selectedPreviewCardInfo = getSelectedPreviewCardDetails();
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_source: source,
        event_title: selectedPreviewCardInfo.title,
        event_link: selectedPreviewCardInfo.link,
        event_isSearchResult: selectedPreviewCardInfo.isSearchResult,
        event_contentSource: selectedPreviewCardInfo.contentSource
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}

/* Logging clicking on link 'This page answered my question' */
function loggingQuestionAnswered() {
    var eventName = "QuestionAnswered";
    var source = Cache_getValue("current-telemetry-source");
    sendMessage({
        action: 'analytics_add_item',
        event_name: eventName,
        event_source: source
    }, function (response) {
        console.log(eventName + ' ' + response.status);
    });
}