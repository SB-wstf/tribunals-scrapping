import schedule
import time,sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from pymongo import MongoClient

# MongoDB setup
client = MongoClient(sys.argv[1])
db = client['stale']
collection = db['rbi']

# Function to scrape PDFs for a given year from the RBI site
def scrape_trend_for_year(driver):
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    pdf_data = []

    for row in soup.find_all('tr'):
        # Locate title and PDF link within each row
        title_td = row.find('td').find('a', class_='link2')
        if title_td:
            title = title_td.text.strip()
            link_td = row.find('td', nowrap='', colspan='3').find('a', target='_blank')
            if link_td:
                pdf_link = link_td['href']
                if pdf_link.endswith(('.PDF', '.pdf')):
                    pdf_data.append({
                        'title': title,
                        'link': pdf_link
                    })

    return pdf_data

# Function to run the entire scraping task
def run_scraping():
    # Initialize the Chrome driver
    driver = webdriver.Chrome()
    driver.maximize_window()

    # URL to RBI's data releases page
    url = 'https://rbi.org.in/Scripts/Pr_DataRelease.aspx?SectionID=372&DateFilter=Year'
    driver.get(url)
    time.sleep(5)

    # Define years to scrape
    years = [str(year) for year in range(2024, 1996, -1)]  # Adjust years range as needed
    year_ids = []

    # Find year elements on the page
    for year in years:
        try:
            element = driver.find_element(By.XPATH, f"//*[@id='{year}']")
            year_ids.append(element.get_attribute('id'))
        except Exception as e:
            print(f"Year {year} not found on the page. Error: {e}")

    # Initialize count and set a threshold to limit the number of PDF scrapes
    count = 0
    MAX_COUNT = 3

    # List to store scraped data
    urban = []

    # Loop through each year to scrape PDF links
    for year_id in year_ids:
        if count >= MAX_COUNT:
            break

        # Click on the year button to load the respective data
        year_button = driver.find_element(By.ID, year_id)
        year_button.click()
        time.sleep(2)

        # Scrape PDFs for the year
        pdf_links = scrape_trend_for_year(driver)
        urban.append(pdf_links)

    driver.quit()  # Close the driver after scraping

    # Tag for the scraped documents
    tagString = 'PRIMARY (URBAN) CO-OPERATIVE BANKS OUTLOOK'.lower().capitalize()

    try:
        # Insert scraped PDFs into MongoDB
        for year in urban:
            if count >= MAX_COUNT:
                break

            for item in year:
                document = {
                    'tagString': f'Publications <-> Annual <-> {tagString}',  
                    'title': item['title'],
                    'pdfUrls': [item['link']]
                }

                # Check if the document already exists in the MongoDB collection
                existing_doc = collection.find_one({'title': item['title']})

                if existing_doc:
                    count += 1  # Increment count if the document is already in the collection
                    if count >= MAX_COUNT:
                        break
                else:
                    # Insert new document into MongoDB
                    try:
                        print("Document",document)
                        collection.insert_one(document)
                    except Exception as e:
                        print(f"Error inserting document: {e}")
                        print(f"Duplicate document: {document}")

        print(f"Finished processing with count: {count}")

    except Exception as ex:
        print(f"Error during insertion loop: {ex}")

