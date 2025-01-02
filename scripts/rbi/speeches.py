from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from pymongo import MongoClient
import time

client = MongoClient("mongodb+srv://deepakkumar:M92xjniipmDT8rtK@cluster0.z2d9d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")

db = client['stale']
collection = db['rbi']
    
    
driver = webdriver.Chrome()
driver.maximize_window()

url = 'https://www.rbi.org.in/Scripts/BS_ViewSpeeches.aspx'
driver.get(url)
time.sleep(5)

year_buttons = driver.find_elements(By.XPATH, "//div[contains(@id, 'btn') and contains(@class, 'year')]")
year_ids = [button.get_attribute('id') for button in year_buttons]

year_ids

archives = year_ids[11:]

def get_archive_button(driver):
    archive_button = driver.find_element(By.XPATH, '//*[@id="divArchiveMain"]')
    archive_button.click()
    time.sleep(2)
get_archive_button(driver)

def scrape_speeches_for_year(driver):
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    pdf_links = []
    pdf_titles = []

    for link in soup.find_all('a', class_='link2', href=True):
        title = link.text.strip().replace('  ', ' ')
        pdf_titles.append(title)
        
    for link in soup.find_all('a', href=True):
        if link['href'].endswith('.PDF') or link['href'].endswith('.pdf'):
            img = link.find('img', src=True)
            if img and 'pdf' in img['src'].lower():
                print(link['href'])
                pdf_links.append(link['href'])
    
    all_pdf_links = []
    for link, title in zip(pdf_links, pdf_titles):
        all_pdf_links.append({
            'link': link,
            'title': title
        })
    
    return all_pdf_links

speeches = []
for year_id in year_ids:
    if year_id in archives:
        get_archive_button(driver)
        
    year_button = driver.find_element(By.ID, year_id)
    year_button.click()
    time.sleep(2)  

    all_months_button_id = year_id[3:] + '0'
    
    all_months_button = driver.find_element(By.XPATH, f'//*[@id="{all_months_button_id}"]')
    all_months_button.click()
    time.sleep(3)

    get_archive_button(driver)
    
    pdf_links = scrape_speeches_for_year(driver)
    speeches.append(pdf_links)

speeches

driver.quit()

speeches[-1]

year_ids[31:]

remaining = []
for year_id in year_ids[31:]:
    if year_id in archives:
        get_archive_button(driver)
        
    year_button = driver.find_element(By.ID, year_id)
    year_button.click()
    time.sleep(2)  

    all_months_button_id = year_id[3:] + '0'
    
    all_months_button = driver.find_element(By.XPATH, f'//*[@id="{all_months_button_id}"]')
    all_months_button.click()
    time.sleep(3)

    get_archive_button(driver)
    
    pdf_links = scrape_speeches_for_year(driver)
    remaining.append(pdf_links)
try:
    for year in remaining:
        for item in year:
            document = {
                'tagString': 'Speeches and Media Interactions <-> Speeches',  
                'title': item['title'],
                'pdfUrls': [item['link']]
            }
            try:
                print("document speeches:",document)
                # collection.insert_one(document)
            except Exception as e:
                print(f"Error inserting document: {e}")
                print(f"Duplicate document: {document}")

except Exception as ex:
    print(f"Error during insertion loop: {ex}")