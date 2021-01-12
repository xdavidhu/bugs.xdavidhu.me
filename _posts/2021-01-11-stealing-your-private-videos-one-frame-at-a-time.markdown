---
layout: post
title:  "Stealing Your Private YouTube Videos, One Frame at a Time"
date:   2021-01-11 12:00:00 +0100
categories: google
priority: P1
priority-tag: <span class="priority" style="border-color:#FF0000">youtube</span>
twitter-image: /assets/posts/2021-01-11-stealing-your-private-videos-one-frame-at-a-time/twitter-card.png
---

Back in December 2019, a few months after I started hacking on Google VRP, I was looking at YouTube. I wanted to find a way to get access to a `Private` video which I did not own.

When you upload a video to YouTube, you can select between 3 privacy settings. `Public`, which means that anyone can find and watch your video, `Unlisted`, which only allows users who know the video ID (the URL) to watch the video, and `Private`, where only you can watch the video, or other accounts you've explicitly given permission to do so.

First thing I did was to upload a video to my second testing account’s YouTube channel, and set the video’s privacy to `Private`, so I can use that video for testing. *(Remember, always only test against resources/accounts you own!)* If I can find a way to access that video with my first testing account, we have a bug.

With my first account, I started using YouTube, trying every feature, pressing every button I could find, and whenever I saw an HTTP request with a video ID in it, I changed it to the target `Private` video, hoping that I can leak some information about it, but I wasn’t really getting any success. The main YouTube site (at least the endpoints I have tested), seems to always check if the video was `Private` or not, and when trying to request info about the target `Private` video, they always returned errors such as `This video is private!`.

I needed to find another way.

A great thing to do in a situation like this, is to try to look for other products/services which are not your main target, but are somehow interacting with its resources internally. If they have access to its resources, it might be possible that they don’t have every level of protection that the main product has.

An interesting target which matched these requirements was Google Ads. This is the product which advertisers use to create ads across all Google services, *including YouTube*. So, the ads you get before YouTube videos are set up by advertisers here, on the Google Ads platform.

So I created a Google Ads account, and created a new advertisement, which would play a video of mine as a skippable ad for YouTube users. During the ad creation process, I also tried to use the target `Private` video’s ID wherever I could, but no success.

After creating the ad, I started looking at all of the different Google Ads features. The thing was huge, it had a bunch of different settings/tools. I was trying to find anything that could be YouTube-related.

There was a page called `Videos`, where I could see a list of videos used by my advertisements. Clicking on a video opened up an `Analytics` section for that specific video. It had an embedded player, some statistics, and an interesting feature called `Moments`. It allowed advertisers to “mark” specific moments of the video, to see when different things happen (such as the timestamp of when the company logo appears). To be honest I am not quite sure what advertisers use this feature for, nevertheless, it seemed interesting:

![The Moments feature on the Ads console](/assets/posts/2021-01-11-stealing-your-private-videos-one-frame-at-a-time/ads-moments.gif)

Looking at the proxy logs, every time I “marked a moment”, a `POST` request was made to a `/GetThumbnails` endpoint, with a body which included a video ID:

```http
POST /aw_video/_/rpc/VideoMomentService/GetThumbnails HTTP/1.1
Host: ads.google.com
User-Agent: Internet-Explorer-6
Cookie: [redacted]

__ar={"1":"kCTeqs1F4ME","2":"12240","3":"387719230"}
```

Where in the `__ar` parameter, `1` was the ID of the video and `2` was the time of the moment in milliseconds. The response was a base64 encoded image, which was the thumbnail displayed by Ads.

I did what I did a bunch of times already, and replaced the ID to my second account’s `Private` video in the request, and to my surprise, **it returned a base64 response**!

I quickly Googled “base64 to image”, and pasted the base64 into the first decoder I found, and it **displayed a thumbnail from the target `Private` video**! It worked! I have found a working IDOR *(Insecure Direct Object Reference)* bug, where I could get a frame from any private video on YouTube!

But I was like “hm, that is just one frame”. We can do better.

I wanted to make a proof of concept Python script which generates an actual, moving “video”. I searched for some calculations, and figured out that if the video is in 24 FPS, one frame stays on the screen for `33` milliseconds. So I just have to download every image starting from `0` milliseconds, incrementing by `33` milliseconds every time, and then construct some kind of video using all of the images I have acquired.

I wrote a quick and dirty POC which downloaded the frames for the first 3 seconds of a video, decoded them, and then generated a GIF. To test it, I have ran it against an old video of mine, which I had previously privated due to, of course, the *high level of cringe*:

<iframe width="100%" height="315px" src="https://www.youtube.com/embed/G3bNbYRTxZM" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

And there you have it, using this bug, any private YouTube video could have been downloaded by a malicious attacker, which to me feels like a pretty cool impact. But of course, it had a few limitations I couldn’t overcome:


- In the real world you would have to know the ID of the target video. Mass-leaking those would be considered a bug on its own.
- Since these are just images, you can’t access audio.
- The resolution is very low. (but it’s high enough to see what is happening)

The takeaway from this bug is that situations where two different products interact with each other under the hood are always a good area to focus on, since both product teams probably only know their own systems best, and might miss important details when working with a different product's resources.

Looking for an IDOR like this can be a very repetitive and manual task, and nowadays I try to avoid just blindly changing IDs everywhere and hoping for the best. After you test a product for a while and get a feel of how it works internally, it might be more effective (and more fun) to try to think about different unexpected actions that the developers maybe didn't think about based on what you saw already, or focus on features that just got released, or to just do any other non-mindless task. You will probably enjoy it more in the long term. In my opinion, the more you understand a system, the more ideas about how to break it will just naturally come to mind.

But again, even in the most robust and well tested systems, there is the chance that just swapping an ID in a request will get you a critical bug.

Thank you for reading! See you [next Monday](https://twitter.com/xdavidhu){:target="_blank"} ;)

### Timeline:
[Dec 11, 2019] - Bug reported \
[Dec 12, 2019] - Initial triage \
[Dec 20, 2019] - Bug accepted (P4 -> P1) \
[Jan 08, 2020] - Bug mitigated by temporarily disabling the `Moments` feature \
[Jan 17, 2020] - Reward of [$5000](https://www.google.com/about/appsecurity/reward-program/){:target="_blank"} issued \
[??? ??, 2020] - `Moments` re-enabled, now it checks if you have access to the video
