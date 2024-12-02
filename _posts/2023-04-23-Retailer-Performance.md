---
layout: post
title:  "Retailer Performance Analysis"
categories: [ R ]
image: assets/images/retail.jpg
---



This was an attempt by me to try and see if I could make business suggestions by exploring seasonality for a retailer. We'll start by playing around with the data a little bit. We know that there's 500,000+ rows but not all of them are going to be useful.

``` r
library(readxl)
library(dplyr)
```

```
## Warning: package 'dplyr' was built under R version 4.3.3
```

```
## 
## Attaching package: 'dplyr'
```

```
## The following objects are masked from 'package:stats':
## 
##     filter, lag
```

```
## The following objects are masked from 'package:base':
## 
##     intersect, setdiff, setequal, union
```

``` r
library(ggplot2)
```

```
## Warning: package 'ggplot2' was built under R version 4.3.3
```

``` r
online_retail <- read_excel("Online Retail.xlsx")

str(online_retail)
```

```
## tibble [541,909 × 8] (S3: tbl_df/tbl/data.frame)
##  $ InvoiceNo  : chr [1:541909] "536365" "536365" "536365" "536365" ...
##  $ StockCode  : chr [1:541909] "85123A" "71053" "84406B" "84029G" ...
##  $ Description: chr [1:541909] "WHITE HANGING HEART T-LIGHT HOLDER" "WHITE METAL LANTERN" "CREAM CUPID HEARTS COAT HANGER" "KNITTED UNION FLAG HOT WATER BOTTLE" ...
##  $ Quantity   : num [1:541909] 6 6 8 6 6 2 6 6 6 32 ...
##  $ InvoiceDate: POSIXct[1:541909], format: "2010-12-01 08:26:00" "2010-12-01 08:26:00" "2010-12-01 08:26:00" "2010-12-01 08:26:00" ...
##  $ UnitPrice  : num [1:541909] 2.55 3.39 2.75 3.39 3.39 7.65 4.25 1.85 1.85 1.69 ...
##  $ CustomerID : num [1:541909] 17850 17850 17850 17850 17850 ...
##  $ Country    : chr [1:541909] "United Kingdom" "United Kingdom" "United Kingdom" "United Kingdom" ...
```

``` r
summary(online_retail)
```

```
##   InvoiceNo          StockCode         Description           Quantity          InvoiceDate                       UnitPrice           CustomerID       Country         
##  Length:541909      Length:541909      Length:541909      Min.   :-80995.00   Min.   :2010-12-01 08:26:00.00   Min.   :-11062.06   Min.   :12346    Length:541909     
##  Class :character   Class :character   Class :character   1st Qu.:     1.00   1st Qu.:2011-03-28 11:34:00.00   1st Qu.:     1.25   1st Qu.:13953    Class :character  
##  Mode  :character   Mode  :character   Mode  :character   Median :     3.00   Median :2011-07-19 17:17:00.00   Median :     2.08   Median :15152    Mode  :character  
##                                                           Mean   :     9.55   Mean   :2011-07-04 13:34:57.16   Mean   :     4.61   Mean   :15288                      
##                                                           3rd Qu.:    10.00   3rd Qu.:2011-10-19 11:27:00.00   3rd Qu.:     4.13   3rd Qu.:16791                      
##                                                           Max.   : 80995.00   Max.   :2011-12-09 12:50:00.00   Max.   : 38970.00   Max.   :18287                      
##                                                                                                                                    NA's   :135080
```

``` r
missing_values <- colSums(is.na(online_retail))
print(missing_values)
```

```
##   InvoiceNo   StockCode Description    Quantity InvoiceDate   UnitPrice  CustomerID     Country 
##           0           0        1454           0           0           0      135080           0
```

``` r
head(online_retail)


hist(online_retail$Quantity, main="Histogram of Quantity", xlab="Quantity", col="blue", breaks=50)
```

![plot of chunk unnamed-chunk-2](/assets/images/retailerCase/1.png)

``` r
country_count <- table(online_retail$Country)
barplot(country_count, main="Bar Plot of Countries", xlab="Country", ylab="Count", col="red", las=2, cex.names=0.7)
```

![plot of chunk unnamed-chunk-2](/assets/images/retailerCase/unnamed-chunk-2-2.png)

``` r
boxplot(Quantity ~ Country, data=online_retail, main="Boxplot of Quantity by Country", xlab="Country", ylab="Quantity", las=2, cex.axis=0.7, outline=FALSE)
```

![plot of chunk unnamed-chunk-2](/assets/images/retailerCase/unnamed-chunk-2-3.png)
Right off the bat, I'm seeing that quantity is not going to be the most useful metric for my exploration unless I make some edits to it. It's basically aggregating ALL the items but we want to get into specific seasonal behavior. A note on as.POSIXct, a base R function that allowed me to convert the InvoiceDate column into the standard date-time format used in R. I think I did this on in one of my earlier run throughs and altered the dataset that way but I'll keep the step in since I think it's a useful tidbit!
We know the UK is overrepresented here, as evident by Dante's analysis as well. To help narrow my focus, I'm going to ignore geographic behavior and instead just focus on seasonality. I ended up also playing around with time based exploration to see if I could garner anything useful but Kylie's visualizations are much more thorough in that regard. Onwards!

``` r
online_retail$InvoiceDate <- as.POSIXct(online_retail$InvoiceDate, format="%Y-%m-%d %H:%M:%S")

# Investigate time and price relationship
ggplot(online_retail, aes(x = InvoiceDate, y = UnitPrice)) +
  geom_point(alpha=0.5) +
  labs(title="Unit Price Over Time", x="Time", y="Unit Price")
```

![plot of chunk unnamed-chunk-3](/assets/images/retailerCase/unnamed-chunk-3-1.png)
I started by removing the non-numeric columns. Initially, I thought that it'd be easy to split the stockcode into items using as numeric but I realized that some of the stockcode had letters at the end that still represented goods.Thus, I needed to find a way to only exclude rows that started with non-numerics while keeping those that end with non-numerics. I then dealt with the negatives in the Quantity column. I'm guessing that we won't need them to predict seasonality especially since we're not really sure what these negatives represent. Perhaps returns? Some descriptions note it as accounting items though, like debt.  

``` r
online_retail
online_retail['StockCode'] <- sapply(online_retail['StockCode'], function(x) as.numeric(as.character(x)))
```

```
## Warning in FUN(X[[i]], ...): NAs introduced by coercion
```

``` r
online_retail
# This is it!
class(online_retail$StockCode)
```

```
## [1] "numeric"
```

``` r
pattern <- "^[A-Za-z]"
d1 <- online_retail[!grepl(pattern,online_retail$StockCode),]

d2 <- d1[d1$Quantity >=0,]
d2
```
Now the descriptions. We have to check if these are actually items. It looks like even those with wonky descriptions are items! But the issue now that we should think about is items that have 0 UnitPrice but a > 0 Quantity. What does that imply? Do we need to redo d2 to include those? My thoughts are that we should just ignore this.
Let's get on with the hypothesis then. I think that Winter is going to be the busiest season for the business because it primarily sells novelty gifts and winter is traditionally when a lot of gifts are given. 
We're going to show the 10 most popular items sold and see if that has any bearing or correlation with the top items by season. Being able to see which of items are the best sellers definitely would help the business inform their sourcing decisions! Furthermore, the plot helps with deciding how much of each item the business should buy. For example, the top two selling items- Paper Craft, Little Birdie and Medium Ceramic Top Storage Jar- outsell all the items by a considerable margin. Perhaps the business should stock more of these. This suggestion is limited though by me not including UnitPrice in my hypotheses. High volume doesn't always neccesarily equal high profit so if I were to improve on this analysis, I'd definitely factor in the price of each item. 

``` r
library(dplyr)
library(ggplot2)
top_selling_items <- d2 %>%
  group_by(StockCode, Description) %>% summarize(TotalQuantity = sum(Quantity)) %>% 
  arrange(desc(TotalQuantity))
```

```
## `summarise()` has grouped output by 'StockCode'. You can override using the `.groups` argument.
```

``` r
print(top_selling_items)

# This will show the 10 most popular items sold .
ggplot(head(top_selling_items,10), aes(x = reorder(Description, TotalQuantity), y = TotalQuantity, fill = TotalQuantity)) +
  geom_bar(stat = "identity") +
  scale_fill_gradient(low="lightblue", high= "darkblue") +
  theme_minimal() +
  labs(x = "Item", y = "Total Quantity Sold", title = "Top Selling Items") +
  coord_flip() # Flipping coordinates for better readability
```

![plot of chunk unnamed-chunk-5](/assets/images/retailerCase/unnamed-chunk-5-1.png)
Seasonality might be a bit challenging. A way to do this might be to partition the dates into four different seasons. Even though this company sells to a bunch of places around the world that might not have the same seasonal procession, let's do Spring, Summer, Fall, Winter . The data set runs from 12/1/2010 to 12/9/2011. So we'll partition accordingly- I did a quick Google search to determine what the seasonal splits by month should be. As follow: Spring-> March to June; Summer -> June to September, Fall -> September to December, Winter-> December to March. I thought I'd have to use lubridate here to do some magic to return the corresponding string but I ended up just writing a function get_season that gets the job done. We have a series of vectors that represent the date partitions outlined above, and then perform a series of checks on the month to determine which vector-and associated season- it will fall in. 

``` r
library(lubridate)
```

```
## Warning: package 'lubridate' was built under R version 4.3.3
```

```
## 
## Attaching package: 'lubridate'
```

```
## The following objects are masked from 'package:base':
## 
##     date, intersect, setdiff, union
```

``` r
get_season <- function(month) {
  if (month %in% c(3, 4, 5)) {
    return("Spring")
  } else if (month %in% c(6, 7, 8)) {
    return("Summer")
  } else if (month %in% c(9, 10, 11)) {
    return("Fall")
  } else {
    return("Winter")
  }
}
```
I then created a new data frame d3, for the final stretch. I found it a good habit for myself to create new dataframes everytime I modified the data. Part of me is curious whether this affects performance for larger and larger datasets but I found it useful to rollback any changes I made to the dataframe, especially when I was tinkering around.I then grouped the seasons accordingly and then looked for the top 10 items in each season.
After grouping the items, I created four bar graphs to represent the sales performance of the top 10 items in each season. This insight is pretty actionable- the firm can focus on which items to push in each season. We see a bit of correlation as well with the top 10 items sold overall, some of which appear in the top 10 items sold in each season. For example, we see that Paper Craft, Little Birdie and World War 2 Gliders Asstd Designs are the top selling items in Winter and Spring respectively. 

``` r
# Adding a new column for the season
d3 <- d2 %>%
  mutate(Month = month(InvoiceDate),
         Season = sapply(Month, get_season))
d3

# Grouping
get_top_items_by_season <- function(d3, season) {
  d3 %>%
    filter(Season == season) %>%
    group_by(StockCode, Description) %>%
    summarize(TotalQuantity = sum(Quantity)) %>%
    arrange(desc(TotalQuantity)) %>%
    head(10)
}
# 
top_items_spring <- get_top_items_by_season(d3, "Spring")
```

```
## `summarise()` has grouped output by 'StockCode'. You can override using the `.groups` argument.
```

``` r
top_items_summer <- get_top_items_by_season(d3, "Summer")
```

```
## `summarise()` has grouped output by 'StockCode'. You can override using the `.groups` argument.
```

``` r
top_items_fall <- get_top_items_by_season(d3, "Fall")
```

```
## `summarise()` has grouped output by 'StockCode'. You can override using the `.groups` argument.
```

``` r
top_items_winter <- get_top_items_by_season(d3, "Winter")
```

```
## `summarise()` has grouped output by 'StockCode'. You can override using the `.groups` argument.
```

``` r
top_items_spring
top_items_summer
top_items_fall
top_items_winter

create_season_graph <- function(season_data, season_name) {
  # Define gradient colors for each season
  gradient_colors <- list(
    "Winter" = c("lightblue", "blue"),
    "Spring" = c("lightgreen", "darkgreen"),
    "Summer" = c("moccasin", "darkorange"),
    "Fall" = c("burlywood", "brown")
  )
  
  ggplot(season_data, aes(x = reorder(Description, TotalQuantity), y = TotalQuantity, fill = TotalQuantity)) +
    geom_bar(stat = "identity") +
    scale_fill_gradient(low = gradient_colors[[season_name]][1], high = gradient_colors[[season_name]][2]) +
    labs(title = paste("Top 10 Items Sold in", season_name),
         x = "Items",
         y = "Total Quantity Sold") +
    theme_minimal() +
    theme(plot.title = element_text(hjust = 0.5, face = "bold"),
          axis.text.x = element_text(angle = 90, vjust = 0.5, hjust = 1, size = 12, face = "bold"),
          axis.title = element_text(face = "bold"),
          plot.margin = margin(1, 1, 1, 1, "cm"))
}


graph_spring <- create_season_graph(top_items_spring, "Spring")
graph_summer <- create_season_graph(top_items_summer, "Summer")
graph_fall <- create_season_graph(top_items_fall, "Fall")
graph_winter <- create_season_graph(top_items_winter, "Winter")

graph_spring
```

![plot of chunk unnamed-chunk-7](/assets/images/retailerCase/unnamed-chunk-7-1.png)

``` r
graph_summer
```

![plot of chunk unnamed-chunk-7](/assets/images/retailerCase/unnamed-chunk-7-2.png)

``` r
graph_fall
```

![plot of chunk unnamed-chunk-7](/assets/images/retailerCase/unnamed-chunk-7-3.png)

``` r
graph_winter
```

![plot of chunk unnamed-chunk-7](/assets/images/retailerCase/unnamed-chunk-7-4.png)
But here's another useful insight. Now that we know the seasonality of items, we can also look at the performance of the seasons themselves. Looking at the plots above, it's pretty clear that some seasons just have more goods sold then others. I decided to visualize this through a bar chart and a pie graph. The bar chart was way more useful as it highlighted the numbers pretty clearly while the pie graph was effective at highlighting which were the busier seasons, did not do as good at job at directly comparing the quantities sold.
We see that Fall and Winter are, by a huge margin, the busiest seasons for the firm with significantly more goods sold. Our hypothesis is actually proven to be incorrect as Fall was the busiest season for the business. I believe that this is because the business is a wholesaler as opposed to something oriented to the general consumer. Since direct consumer gift shops would likely forecast their demand in the season(s) before and then purchase accordingly, winter would not be the prime period for this business. It's still a busy season though, just not as much as fall is- smaller shops or the occasional late requisition might come through. This perspective supports why Spring and Summer aren't as busy as well since most purchasers are probably in their demand forecasting stages. With this information, the business can think about workforce requirements as well as securing additional logisitical support or whatnot for the seasons that are the busiest!

``` r
# Let's now see which season has the highest number of goods sold.
seasonal_sales <- d3 %>%
  group_by(Season) %>%
  summarize(TotalQuantity = sum(Quantity)) %>%
  arrange(desc(TotalQuantity))
highest_season <- head(seasonal_sales, 1)
highest_season

seasonal_sales$Season <- factor(seasonal_sales$Season, levels = c("Winter", "Spring", "Summer", "Fall"))
season_colors <- c("Winter" = "lightblue", "Spring" = "green", "Summer" = "orange", "Fall" = "brown")

ggplot(seasonal_sales, aes(x = Season, y = TotalQuantity, fill = Season)) +
  geom_bar(stat = "identity") +
  scale_fill_manual(values = season_colors) +
  theme_minimal() +
  labs(x = "Season", y = "Total Goods Sold", title = "Total Sales Quantity by Season")
```

![plot of chunk unnamed-chunk-8](/assets/images/retailerCase/unnamed-chunk-8-1.png)

``` r
ggplot(seasonal_sales, aes(x = "", y = TotalQuantity, fill = Season)) +
  geom_bar(stat = "identity", width = 1) +
  coord_polar("y", start = 0) +
  scale_fill_manual(values = season_colors) +
  theme_minimal() +
  theme(axis.line = element_blank(),
        axis.text = element_blank(),
        axis.ticks = element_blank(),
        panel.grid = element_blank(),
        plot.title = element_text(hjust = 0.5, face = "bold", size = 14),
        legend.title = element_text(face = "bold"),
        legend.position = "bottom",
        plot.margin = margin(1, 1, 1, 1, "cm")) +
  labs(fill = "Season", title = "Total Sales Quantity by Season", x = NULL, y = NULL)
```

![plot of chunk unnamed-chunk-8](/assets/images/retailerCase/unnamed-chunk-8-2.png)

``` r
# A pie chart isn't at good as highlighting the values
```
My final bit was to try to predict demand for the years to come. This ended up being quite challenging for me and I so I ended up using a very simple moving average forecast as supposed to something more substantial. There are limitations with this methodology as well as it ignores any sort of seasonal trends and basically just provides a flat line representing the average of the last observations. I was also limited by the number of periods in this dataset as it only collected a year's worth of observations. I think that with a more robust dataset, we'd be able to see the seasonal behavior of fall and winter being the busiest seasons reflected in any such demand forecast. A task for another time, I suppose- or another curious student!

``` r
# An attempt at a prediction
library(forecast)
```

```
## Warning: package 'forecast' was built under R version 4.3.3
```

```
## Registered S3 method overwritten by 'quantmod':
##   method            from
##   as.zoo.data.frame zoo
```

``` r
install.packages("dplyr")
```

```
## Error in install.packages : Updating loaded packages
```

``` r
library(dplyr)
data_ts <- d3 %>%
  mutate(Month = floor_date(InvoiceDate, "month")) %>%
  group_by(Month) %>%
  summarize(TotalQuantity = sum(Quantity)) %>%
  ungroup()
ts_data <- ts(data_ts$TotalQuantity, start = c(2010, 12), frequency = 12)
ma_fit <- stats::filter(ts_data, rep(1/3, 3), sides = 2)
ma_extension <- rep(tail(ma_fit, 1), 12)  # Extend for 12 months into 2012

full_ma <- c(ma_fit, ma_extension)
full_ts <- ts(full_ma, start = c(2010, 12), frequency = 12)

# Plotting
plot(full_ts, main = "Extended Moving Average Forecast", xlab = "Time", ylab = "Total Quantity", col = "blue")
```

![plot of chunk unnamed-chunk-9](/assets/images/retailerCase/unnamed-chunk-9-1.png)
