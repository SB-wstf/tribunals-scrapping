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

# Function to scrape and insert PDFs
def scrape_rbi_pdfs():
    driver = webdriver.Chrome()
    driver.maximize_window()

    url = 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx'
    driver.get(url)
    time.sleep(5)

    def get_archive_button(driver):
        archive_button = driver.find_element(By.XPATH, '//*[@id="divArchiveMain"]')
        archive_button.click()
        time.sleep(2)

    def scrape_pdfs_for_year(driver):
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        pdf_links = []
        pdf_titles = []

        for link in soup.find_all('a', class_='link2', href=True):
            title = link.text.strip().replace('  ', ' ')
            pdf_titles.append(title)

        for link in soup.find_all('a', href=True):
            if link['href'].endswith('.PDF'):
                img = link.find('img', src=True)
                if img and 'pdf' in img['src'].lower():
                    pdf_links.append(link['href'])

        all_pdf_links = []
        for link, title in zip(pdf_links, pdf_titles):
            all_pdf_links.append({
                'link': link,
                'title': title
            })

        return all_pdf_links

    # Initialize the count and the maximum count of existing documents
    existing_count = 0
    MAX_EXISTING_COUNT = 3

    year_buttons = driver.find_elements(By.XPATH, "//div[contains(@id, 'btn') and contains(@class, 'year')]")
    year_ids = [button.get_attribute('id') for button in year_buttons]
    year_ids = year_ids[:-2]  # Adjust as needed

    for year_id in year_ids:
        if existing_count >= MAX_EXISTING_COUNT:
            print("Reached max existing count, stopping scraper.")
            break

        # Click the year button
        year_button = driver.find_element(By.ID, year_id)
        year_button.click()
        time.sleep(2)

        # Click all months button
        all_months_button_id = year_id[3:] + '0'
        all_months_button = driver.find_element(By.XPATH, f'//*[@id="{all_months_button_id}"]')
        all_months_button.click()
        time.sleep(3)

        get_archive_button(driver)

        # Scrape PDF links for the current year
        pdf_links = scrape_pdfs_for_year(driver)

        # Process and insert documents into MongoDB one by one
        for item in pdf_links:
            document = {
                'tagString': 'Press Releases',
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

