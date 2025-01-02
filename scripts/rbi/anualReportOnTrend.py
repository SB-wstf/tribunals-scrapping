import time,sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from pymongo import MongoClient

# MongoDB setup
client = MongoClient(sys.argv[1])
db = client['stale']
collection = db['rbi']

# Function to scrape trend reports for a given year
def scrape_trend_for_year(driver):
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    pdf_data = []

    for row in soup.find_all('tr'):
        title_td = row.find('td', style='word-wrap:break-word;width:2000;')
        if title_td:
            title = title_td.text.strip()
            link_td = row.find('td', nowrap=True).find_next('td', nowrap=True)
            if link_td:
                pdf_link_tag = link_td.find('a', href=True)
                if pdf_link_tag and pdf_link_tag['href'].endswith(('.PDF', '.pdf')):
                    pdf_data.append({
                        'title': title,
                        'link': pdf_link_tag['href']
                    })

    return pdf_data

# Archive button function
def get_archive_button(driver):
    archive_button = driver.find_element(By.XPATH, '//*[@id="divArchiveMain"]')
    archive_button.click()
    time.sleep(2)

# Scraper function
def run_scraping():
    driver = webdriver.Chrome()
    driver.maximize_window()

    url = 'https://rbi.org.in/Scripts/AnnualPublications.aspx?head=Trend%20and%20Progress%20of%20Banking%20in%20India'
    driver.get(url)
    time.sleep(5)

    years = [str(year) for year in range(2024, 1996, -1)]
    year_buttons = []
    for year in years:
        try:
            element = driver.find_element(By.XPATH, f"//*[@id='{year}']")
            year_buttons.append(element.get_attribute('id'))
        except:
            print(f"Year {year} not found on the page")

    archives = year_buttons[11:]  # Assuming archives start from the 12th button

    existing_count = 0  # Track how many existing documents are found
    MAX_EXISTING_COUNT = 3  # Stop after finding 3 existing documents

    for year_id in year_buttons:
        if existing_count >= MAX_EXISTING_COUNT:
            print("Reached max existing count, stopping scraper.")
            break

        if year_id in archives:
            get_archive_button(driver)

        year_button = driver.find_element(By.ID, year_id)
        year_button.click()
        time.sleep(2)

        # Scrape PDF links for the current year
        pdf_links = scrape_trend_for_year(driver)

        # Process and insert documents into MongoDB one by one
        for item in pdf_links:
            document = {
                'tagString': 'Publications <-> Annual <-> Report on trend and progress of banking in India',
                'title': item['title'],
                'pdfUrls': [item['link']]
            }

            # Check if document already exists
            existing_doc = collection.find_one({'title': item['title']})

            if existing_doc:
                # Increment count if the document already exists
                existing_count += 1
                print(f"Document already exists: {item['title']} (Existing count: {existing_count})")
                if existing_count >= MAX_EXISTING_COUNT:
                    print("Max existing documents found, stopping.")
                    driver.quit()
                    return  # Stop processing if existing_count reaches 3
            else:
                # Insert new document into MongoDB
                try:
                    collection.insert_one(document)
                    print(f"Inserted new document: {document['title']}")
                except Exception as e:
                    print(f"Error inserting document: {e}")

    driver.quit()

