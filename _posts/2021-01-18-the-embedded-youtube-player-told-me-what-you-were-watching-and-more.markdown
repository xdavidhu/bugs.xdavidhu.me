---
layout: post
title:  "The Embedded YouTube Player Told Me What You Were Watching (and more)"
post-title:  "The Embedded YouTube Player Told Me What You Were Watching<br/>(and more)"
date:   2021-01-18 12:00:00 +0100
categories: google
priority-tag: <span class="priority" style="border-color:#FF0000">youtube</span>
twitter-image: /assets/posts/2021-01-18-the-embedded-youtube-player-told-me-what-you-were-watching-and-more/twitter-card.png
---

*2019, October 11, 00:16:* \
I finish the cold frozen pizza that I made hours before but forgot to eat, finally write the report, press submit on the Google security bug submission form, and see the classic, `Thanks! We received your report.` message. That feeling is hard to beat.

I just submitted a bug, using which, I could simply send a link to someone, and when they click on it and visit my website, I could **steal their YouTube watch history**, the **links to watch all of their unlisted videos**, their **Watch Later playlist**, the list of **videos they've liked**, and more. It was pretty damn cool.

How was this possible? Let’s go back in time a little bit.

*Already made some progress? Skip ahead to [Chapter 2](#chapter2){:target="_self"}, [Chapter 3](#chapter3){:target="_self"}, or [Chapter 4](#chapter4){:target="_self"}!*

#### Chapter 1: <br/>Your special playlists you never created {#chapter1}

This issue requires a little bit of understanding about the inner-workings of YouTube. Most importantly, about these four interesting playlists:

Since YouTube is made up of videos, a bunch of internal stuff in YouTube is made up of **playlists**. Everybody has a few of them, even if they have never created one. I knew about these from previous research I have done (*by previous research, I just mean trying every feature and trying to understand how they work*), before finding this bug. Let’s look at these playlists one-by-one because they will be important later.

**The Watch History playlist:**

At the time of finding this bug, every YouTube user had a playlist with the ID `HL`, which stands for “History List” (I assume). This list contained every video you previously watched on YouTube.

**The Watch Later playlist:**

You have probably seen the little `clock` icon everywhere on YouTube, which when pressed, adds the video to your “Watch Later”. This is also just a special playlist internally, with the ID `WL`.

**The Liked Videos playlist:**

This is a tricky one. At the time of finding the bug, I was a bit confused about how this works, so I had to use a little bit of guessing. All I knew, that it was constructed by somehow modifying your channel ID, which is a 24 char long string, and can be found by going to your channel page, and looking at the URL: 

```js
"https://www.youtube.com/channel/UCBvX9uEO0a3fZNCK12MAgug"
-> channel_id = "UCBvX9uEO0a3fZNCK12MAgug"
```

After a bit of trial and error, and by looking at the playlists of my testing/personal accounts, I figured out a way to “guess” the special “Liked Videos” playlist. You just had to replace the first 3 characters of the channel ID with `LLD` or `LLB`:

```js
// one of them will be the “Liked Videos” playlist of the given channel
“UCBvX9uEO0a3fZNCK12MAgug” -> “LLDvX9uEO0a3fZNCK12MAgug”
“UCBvX9uEO0a3fZNCK12MAgug” -> ”LLBvX9uEO0a3fZNCK12MAgug”
```

**And finally, the most important, the Uploads playlist:**

This special playlist contains **all of your videos**. It has everything in it, regardless of the video’s privacy setting. So all `Public`, `Unlisted` and `Private` videos you have ever uploaded, are in your special “Uploads” playlist.

At the time of finding the bug, the same guessing thing had to be used as for the “Liked Videos” playlist, but this time first 3 characters of the channel ID had to be `UUD` or `UUB`:

```js
// one of them will be the “Uploads” playlist of the given channel
“UCBvX9uEO0a3fZNCK12MAgug” -> “UUDvX9uEO0a3fZNCK12MAgug”
“UCBvX9uEO0a3fZNCK12MAgug” -> ”UUBvX9uEO0a3fZNCK12MAgug”
```

Or, if you don’t want to do any of that, you can just go to the channel's page, click the `Videos` tab, and click `Play All`. But only if that button is visible, which is unfortunately not always the case.

If you are interested in the details about how these playlists have changed since 2019, and how they work today at the time of writing this post, you can check out [this Gist I made](https://gist.github.com/xdavidhu/136c7dfa9247e4883c1e4dc7a77350e6).

So now you know about these special playlists every YouTube user has. Now, you might think that we should just open for example someone's "Uploads" playlist like you would open any other playlist, and simply leak all of their unlisted videos:

```
// how to steal someone's unlisted videos (very easy!!)

1. Open https://www.youtube.com/playlist?list=[victims-uploads-playlist]
2. Profit!?
```

Unfortunately, it’s not that easy. These playlists are special in another way too, which is that **different users will see different videos in them**. If the channel owner opens his/her “Uploads” playlist, she will see all of her videos, regardless of the privacy setting. If an attacker tries to open the victim’s “Uploads” playlist, **only the `Public` videos will be shown**, any other `Unlisted` and `Private` videos the victim has will just not be there.

As an attacker, we can clearly see that these playlists can contain very sensitive information about the users. We would like to steal these. But unfortunately, they seem to be well protected...

#### Chapter 2: <br/>The Embedded Player and it’s API {#chapter2}

If you have a website and want to have a little YouTube player inside it, there is an app for that. And it’s called the [YouTube IFrame Player](https://developers.google.com/youtube/iframe_api_reference). Embedding this player into your website is quite easy, you just have to copy some HTML code with an `iframe` tag, and paste it into your site’s source:

![Screenshot of an empty webpage with an embedded YouTube player](/assets/posts/2021-01-18-the-embedded-youtube-player-told-me-what-you-were-watching-and-more/embedded-player.png)

 But today websites are rarely that simple, so you might wonder, what if I want to dynamically create a YouTube player with JavaScript? What if I want to automatically pause the video? These problems would seem quite hacky, or even impossible in some cases, due to the rules of the [Same-origin Policy](https://en.wikipedia.org/wiki/Same-origin_policy), and other protections modern browsers provide.

Thankfully, YouTube has a solution for this as well, the [YouTube Player API](https://developers.google.com/youtube/iframe_api_reference). This API allows you to just add a JS library to your site, and then simply create/modify/control the YouTube players on your site however you'd like, using JavaScript. For example, if you want to pause a video, you can just call `player.pauseVideo()`.

*Hm..* This is pretty interesting, but how does it work? The answer might be obvious if you have previously worked with cross-origin (iframe) communication. The YouTube player uses the browser’s [PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage), which allows different origins (in our case your site and the YouTube iframe), to send each other little messages over a secure channel. So the YouTube player has a `postMessage` listener where it listens to commands, and the JS library you put into your site sends messages to it when you want to perform some action, like pausing the video. Actually, the YouTube player is talking a lot, even if you don’t ask it anything. It immediately tells the JS library on your site if anything happens with the player. This makes it possible for your site to add event listeners, which get called when for example the user skips into a currently playing video.

Let’s see a quick example of how this communication works under the hood:

```js
// this postMessage is sent from your site to the iframe under the hood when you call “player.playVideo()”
-> {"event":"command","func":"playVideo","args":[],"id":1,"channel":"widget"}

// the iframe sends a lot of stuff back, here are some examples
<- {"event":"infoDelivery","info":{"playerState":-1,"currentTime":0,"duration":1344,"videoData":{"video_id":"M7lc1UVf-VE","author":"","title":"YouTube Developers Live: Embedded Web Player Customization"},"videoStartBytes":0,"videoBytesTotal":1,"videoLoadedFraction":0,"playbackQuality":"unknown","availableQualityLevels":[],"currentTimeLastUpdated_":1610191891.79,"playbackRate":1,"mediaReferenceTime":0,"videoUrl":"https://www.youtube.com/watch?v=M7lc1UVf-VE","playlist":null,"playlistIndex":-1},"id":1,"channel":"widget"}
<- {"event":"onStateChange","info":-1,"id":1,"channel":"widget"}
```

Just a reminder, I was often confused about this, but the “under-the-hood” commands I just showed an example of are sent **by your site**. By “under-the-hood”, I just mean that developers usually include YouTube’s library, to make communication easier, and that library simply abstracts the details away, so you can just call `pauseVideo()`, without worrying about anything else. But of course, if you would want, you could manually send these `postMessage`s to the player, via plain old vanilla JavaScript, and it would work in the exact same way as using the fancy JS library. So just think of it as an abstraction layer, which you have full control of.

If you want to see what `postMessage`s a page receives, you could just add an event listener to the page which prints every message to the console:

```js
// listen for all “message” events and log them to the console:
> window.addEventListener("message", function(event){console.log(event.data)})
```

Okay, so we can play and pause the player with JavaScript. That’s nothing crazy, but it’s cool. Is there anything else we can do? Yes, there is. Actually, if you read the documentation, there is a bunch of stuff we can do using this Player API. Let’s see some of them that might look interesting to us:

**The `player.getPlaylist()` function:**

If you want to embed a playlist into your site, you can use the `player.loadPlaylist(playlist_id)` method of the library to load a playlist into an existing embedded player. After this, you could call `playVideo()`, and start playing the first video, after which, the next one from the playlist will automatically start playing, and so on. So we have playlist support.

Now, what if you want to embed a playlist into your site, but want to know what videos are in it? There is a [function](https://developers.google.com/youtube/iframe_api_reference#Retrieving_playlist_information) for that as well. Calling `player.getPlaylist()`, on a player that has a playlist currently loaded, will return *an array of the video IDs in the playlist as they are currently ordered*:

```js
> player.getPlaylist()

Array(20) [ "KxgcVAuem8g", "U_OirTVxiFE", "rbez_1MEhdQ", "VpC9qeKUJ00",
            "LnDjm9jhkoc", "BQIOEdkivao", "layKyzA1ABc", "-Y9gdQnt7zs",
            "U_OX5vQ567Y", "ghOqpVet1uQ", … ]
```

Good to know..

**The not-really deprecated `player.getVideoData()` function:**

If you look at the raw `postMessage` communication, often you can see an object named `videoData` being sent by the iframe to the page. This object contains a bunch of stuff about the currently playing video, including its title.

```js
> player.getVideoData()

Object { video_id: "KxgcVAuem8g", author: "LiveOverflow2",
        title: "Astable 555 timer - Clock Module", video_quality: "medium",
        video_quality_features: [], list: "PLGPckJAmiZCTyI72iI2KaJxkp-vUKBlTi" }
```

This function is not listed in the official YouTube documentation, supposedly it got removed a few years ago, but as a fellow Stack Overflow member [pointed out](https://stackoverflow.com/questions/47282202/youtube-iframe-player-api-getvideodata-is-removed-how-to-get-title):

![Comment on StackOverflow saying that the function still works in 2017](/assets/posts/2021-01-18-the-embedded-youtube-player-told-me-what-you-were-watching-and-more/getvideodata-stackoverflow.png)

*(Even if the `getVideoData()` function would be fully removed from the library, as I said before, as long as the iframe sends that object to your page, you could access it.)*

Again, interesting, let’s just note that we can do this as well..

***One last thing* about the embedded player:**

If you are logged in to YouTube, the embedded player is also "logged in". Videos you watch in the player will get added to your Watch History. There is always a little `clock` icon in the player using which you can add the video to your account's watch later. So, we could say that if you are logged in to YouTube, the player is also logged in, and it has "full-access" to your account, just like the main YouTube site has.

#### Chapter 3: <br/>Connecting things together {#chapter3}

I really like this bug because of how it didn’t need any fancy “hacking techniques”. Actually, I wasn’t even at a computer when I found this bug, so to say..

You might already put the two things together, and also found the bug, just by reading the first two chapters of this writeup.

At the time, I was looking at YouTube for a while already, testing the playlists separately, and later, testing the embedded player. I wasn’t able to find any bugs. Then, one day, I remember, I was standing on a tram, probably on my way to school, (probably late, as always **:(** ), and I had this idea:

“Wait a second. Only the owner can see her playlist’s contents. I have the tools to play any playlist in the name of the owner (since the embedded player is also “logged in” to YouTube), and I also have the tools to get the videos from the currently playing playlist. *What?* Is it this easy?”

Turns out it was that easy. Later, at home, I made a page where I embedded a YouTube player and instructed it to play the playlist `HL` (the one with your Watch History), and once it loaded, I called `player.getPlaylist()`, and I think I just printed the result to the console.

I opened the page with my test account **and saw the test account’s watch history get printed to the console.**

**Boom! We have a bug!** You visit my page, I steal your Watch History! Not bad.

So we can embed the Watch History playlist. *Why not embed other things?*

I got to work to make a pretty epic POC, which demonstrated everything an attacker could do using this bug. Here are all of the exploits I was able to pull off using this issue, other than stealing your Watch History:

**Stealing your Watch Later:**

Similarly to the `HL` playlist, we could just embed the `WL` playlist, and steal the contents of the victim's Watch Later using `player.getPlaylist()`.

**Stealing the videos you have liked:**

These next exploits will require a targeted attack since the IDs we will be requesting will be based on the victim’s channel ID. Stealing the `HL` and the `WL` playlist does not require any victim-specific setup, since everyone has those same IDs.

I have previously explained how to get the playlist ID of the “Liked Videos” playlist. If I knew the victim's channel ID previously, I could set up a page that loads both of the victim's possible playlist IDs, and tries to list them using `player.getPlaylist()`. One of the tries will succeed, and I will have a list of all of the videos the victim has previously liked.

**Stealing any private playlist you might have:**

Since we are playing these playlists “in the name of the victim”, if the victim has any custom-made private playlists, and we somehow already know it’s ID (this would be pretty hard, so the impact of this is quite low), we could just embed it, and as before, just use `getPlaylist()` to steal the contents.

**Stealing the title & some other info about a private video:**

For this, again, we would have to know the ID of the victim's private video we want to target, which would be pretty hard and would probably require a different bug.

But if we know an ID for a victim's private video, we could embed that private video to the malicious site, and use `player.getVideoData()` to steal its title, and some other extra information about it, like the list of available caption languages.

**The best for the last, stealing all of your Unlisted videos:**

I like this the most since a lot of people use unlisted videos to share personal/not-public videos with only specific people. I’m also doing this, all of the POC videos I send to Google are unlisted videos, and I would consider them pretty sensitive.

So I have previously explained how to get the ID of the “Uploads” playlist for a given channel, and as you might already expect, we could simply embed that playlist into our malicious site.

At the time of finding this bug, embedding the “Uploads” playlist as an owner worked a little bit differently than I expected. Previously I have said that the owner can see all of the videos in this playlist, despite the privacy settings. This is still almost the case, but when an “Uploads” playlist was embedded, the owner only saw the `Public` and the `Unlisted` videos in it, the `Private` videos were omitted. This is perfectly fine for the current attack, but this was a limitation that didn’t allow us to leak all of the `Private` video IDs, and steal all of the private titles (using the previous attack). Or, stealing all of the private videos altogether, using the bug from my [previous writeup](https://bugs.xdavidhu.me/google/2021/01/11/stealing-your-private-videos-one-frame-at-a-time/).

Anyways, we had the ID of the “Uploads” playlist, we could embed it into our site, and then use the `player.getPlaylist()` function to list all of video IDs inside.

If a video is `Unlisted`, the only thing which keeps it secret is its video ID. **Now, because we stole all of the unlisted video ID’s, we could watch all of the victim's unlisted videos!**

Here is [the POC](https://gist.github.com/xdavidhu/de4906058c1d6d2031933f9847634130) I have sent to Google. At the time, I, unfortunately, did not make a POC video, and since the issue is now fixed, I made some screenshots to show you how it looked like.

Opening the POC HTML automatically embedded 2 playlists, `HL` and `WL`, and displayed the contents as two lists under the players:

![Screenshot of the first part of the POC](/assets/posts/2021-01-18-the-embedded-youtube-player-told-me-what-you-were-watching-and-more/poc-first.png)

Scrolling down a bit, you can see the "targeted attacks" section. After entering your channel ID, it listed your "Liked videos" and your "Uploaded videos", **including your unlisted videos**. Under that, you could enter a private video ID you had access to, and it displayed the video's title and listed the available caption languages:

![Screenshot of the second part of the POC](/assets/posts/2021-01-18-the-embedded-youtube-player-told-me-what-you-were-watching-and-more/poc-second.png)


#### Chapter 4: <br/>How it all ends {#chapter4}

*2019, October 11, 01:15:* \
My part is done, I go to sleep. But not before refreshing my email one last time, hoping that I might have already got a response. The chances of that are almost zero, but the excitement makes me do this every time I send in a bug.

After two weeks, and a bit of misunderstanding, the bug gets triaged with “At first glance, this might not be severe enough to qualify for a reward”. This hits me quite hard since back then, all of my previous bugs got this same triage message, and after finding this one, I got really excited and was pretty sure to get the mighty “Nice catch! I've filed a bug based on your report.” for the first time. But I didn’t. I was tweeting quite frequently at the time, so I [let out my frustration a little bit](https://twitter.com/xdavidhu/status/1187424863356628994):

![My slightly-salty tweet about the email I have got](/assets/posts/2021-01-18-the-embedded-youtube-player-told-me-what-you-were-watching-and-more/might-not-qualify-tweet.png)

I was feeling a little down, since I have been hacking on Google VRP for two months already, and all of my bugs got the `might not be severe enough` message. But most of them were still waiting for the [VRP Panel decision](https://sites.google.com/site/bughunteruniversity/behind-the-scenes/life-of-a-reward) about the reward, so not all hope was lost. *Yet.*

Almost a month later, I get a new email from `buganizer-system@google.com`. As a Google VRP bug hunter, these are the emails you are looking for. I open it, and I see that this bug got rewarded with a bounty of **$1,337**. This was my first “leet” reward. I [tweeted a gif of a dancing parrot](https://twitter.com/xdavidhu/status/1195413121390829570). I like to use that gif for such occasions:

![My tweet of a dancing parrot](/assets/posts/2021-01-18-the-embedded-youtube-player-told-me-what-you-were-watching-and-more/parrot-tweet.gif)

At the time I also found it a bit weird, but looking back at it, I still think that the impact of this bug was higher than the issued reward. Just thinking about my personal use case, stealing all of the POC videos of potentially unfixed Google bugs from someone (since I am uploading them to YouTube as `Unlisted` videos) feels pretty high impact for me. Not even talking about the Watch History.

I did not get back to Google about my feelings regarding the impact, so it is possible that if I tell them the reasons why I think it deserves a bigger bounty, they might re-consider the reward decision. If you are in a similar situation, don’t be afraid to ask.

**The fix:**

16 days after getting the reward email, I get a new email, saying that the issue is fixed. I check out what they did.

When the embedded player loads a playlist, it get’s the contents using the `/list_ajax?list=[playlist-id]` endpoint. Now, if you give any private/special playlist to this endpoint, it will return an error. Because of this, embedding any of the previously mentioned playlists will just fail, and the player will display an error.

This seemed to be implemented correctly, but one issue was still working, and it was the leaking of  the `videoData` object on a private video, which included the title, and some other information. I ping the bug, saying that this issue still works. For some reason, I do not receive a reply. I ping Google once again, and I get a reply saying that they will let the product team know.

I got back to this bug now, in 2021, and I wanted to re-test the fixes before starting to work on a writeup. Turns out, they also fixed the `videoData` leak now. If a video is private, you can still embed it, but the `videoData` that the player sends to your site will just be an empty object.

**Conclusion:**

What I like about this bug is that proves what I always say when someone asks me how I hunt for bugs, or how they should hunt for bugs. I even said it in my [previous writeup](https://bugs.xdavidhu.me/google/2021/01/11/stealing-your-private-videos-one-frame-at-a-time/):

***“In my opinion, the more you understand a system, the more ideas about how to break it will just naturally come to mind.”***

Thank you for reading!

### Timeline:
[Oct 11, 2019] - Bug reported \
[Oct 11, 2019] - Initial triage \
[Oct 24, 2019] - Bug accepted (P4 -> P2) \
[Nov 14, 2019] - Reward of [$1337](https://www.google.com/about/appsecurity/reward-program/) issued \
[Nov 30, 2019] - First part of the bug mitigated \
[??? ??, 2020] - Second part of the bug mitigated, issue is fully fixed